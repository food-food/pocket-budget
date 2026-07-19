/* assistant.js — AI transaction assistant, pure JS parser (no API key needed) */
'use strict';

(function () {
  const { CATEGORIES, ACCOUNTS, isoDate, parseISO } = window.Budget;
  const Icon = window.Icon;
  const e = React.createElement;

  // ─── date parser ──────────────────────────────────────────────────────────

  function parseDate(text) {
    const t = text.toLowerCase();
    const today = new Date(); today.setHours(0,0,0,0);

    if (/\btoday\b/.test(t)) return isoDate(today);
    if (/\byesterday\b/.test(t)) {
      const d = new Date(today); d.setDate(d.getDate() - 1); return isoDate(d);
    }

    // "last monday" / "this friday" / just "monday"
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const lastMatch = t.match(/\b(?:last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
    if (lastMatch) {
      const target = dayNames.indexOf(lastMatch[1]);
      const cur    = today.getDay();
      let diff = cur - target;
      if (diff <= 0 || /\blast\b/.test(lastMatch[0])) diff += 7;
      const d = new Date(today); d.setDate(d.getDate() - diff); return isoDate(d);
    }

    // "june 3" / "jun 3" / "3rd" / "the 3rd"
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const fullMonths = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const monMatch = t.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/);
    if (monMatch) {
      const mi = fullMonths.indexOf(monMatch[1]) !== -1 ? fullMonths.indexOf(monMatch[1]) : months.indexOf(monMatch[1].slice(0,3));
      const d = new Date(today.getFullYear(), mi, parseInt(monMatch[2]));
      if (d > today) d.setFullYear(d.getFullYear() - 1);
      return isoDate(d);
    }

    // "7/3/26", "7/3/2026", "7/3" — numeric M/D or M/D/YY
    const numericDate = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (numericDate) {
      const month = parseInt(numericDate[1]) - 1;
      const day   = parseInt(numericDate[2]);
      let year = today.getFullYear();
      if (numericDate[3]) {
        year = parseInt(numericDate[3]);
        if (year < 100) year += 2000;
      }
      const d = new Date(year, month, day);
      if (!numericDate[3] && d > today) d.setFullYear(d.getFullYear() - 1);
      return isoDate(d);
    }

    // "3rd" / "on the 5th"
    const ordMatch = t.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
    if (ordMatch) {
      const day = parseInt(ordMatch[1]);
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      if (d > today) d.setMonth(d.getMonth() - 1);
      return isoDate(d);
    }

    return isoDate(today);
  }

  // ─── amount extractor ─────────────────────────────────────────────────────

  // returns array of {amount, index} from a string
  function extractAmounts(text) {
    const results = [];
    const re = /\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*(?:dollar|buck|cent)/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = (m[1] || m[2]).replace(',', '');
      results.push({ amount: parseFloat(raw), index: m.index });
    }
    return results;
  }

  // ─── type detector ────────────────────────────────────────────────────────

  const INCOME_WORDS  = /\b(got|received|get|earn|earned|allowance|paid me|gave me|sent me|deposited|refund|sold|birthday money|gift money|babysitting|chore|paycheck|income)\b/i;
  const EXPENSE_WORDS = /\b(spent|spend|bought|buy|paid|pay|charged|cost|ordered|purchased|got|picked up)\b/i;

  function detectType(chunk) {
    if (INCOME_WORDS.test(chunk)) return 'income';
    return 'expense'; // default
  }

  // ─── category guesser ─────────────────────────────────────────────────────

  const CAT_RULES = [
    { id: 'food',      re: /\b(food|eat|ate|eating|lunch|dinner|breakfast|brunch|restaurant|cafe|coffee|starbucks|mcdonald|mcdonalds|subway|chipotle|pizza|sushi|taco|tacos|burger|boba|bubble tea|tea|snack|snacks|grocery|groceries|supermarket|trader joe|whole food|doordash|ubereats|grubhub|chick.fil|wendy|wendys|taco bell|domino|dominos|dunkin|panda express|shake shack|five guys|in.n.out|sweetgreen|panera|chilis|applebees|dine|diner|bakery|gelato|ice cream|smoothie|juice|ramen|noodle|noodles|bagel|drinks|drink|auntie anne|pretzel|popcorn|candy|hot dog|chips|fries|wing|wings|korean bbq|hibachi|boba shop|milk tea|matcha|lemonade|water|soda|water bottle|cane|raising cane|chilis|olive garden|red lobster|outback|ihop|waffle house|cracker barrel|sonic|dairy queen|dq|culver|whataburger|portillo|portillos|potbelly|jersey mike|jimmy john|firehouse|wingstop|raising|insomnia|crumbl|cookie|cookies|cupcake)\b/i },
    { id: 'clothes',   re: /\b(cloth|clothes|clothing|shirt|tshirt|t-shirt|shoe|shoes|outfit|dress|pants|jeans|jacket|hoodie|hoodie|sweater|fashion|style|wear|wore|sneaker|sneakers|boot|boots|sock|socks|underwear|hat|cap|beanie|bag|purse|backpack|accessory|accessories|h&m|zara|urban outfitter|forever 21|uniqlo|nordstrom|nordstrom rack|macy|macys|target cloth|old navy|gap|thrift|thrifting|goodwill|vintage|nike|adidas|vans|converse|levi|levis|hollister|aeropostale|american eagle|pacsun|shein|temu|fashion nova|princess polly|revolve|free people|brandy melville|lululemon|athletic|athleisure|sports bra|leggings|joggers|sweatpants|sweatshirt|polo|button up|blazer|skirt|shorts|swimsuit|bikini|swim)\b/i },
    { id: 'ent',       re: /\b(fun|game|games|gaming|movie|movies|film|netflix|hulu|disney|disney\+|hbo|max|peacock|paramount|spotify|apple music|youtube|twitch|roblox|fortnite|minecraft|steam|concert|ticket|tickets|show|event|bowling|arcade|claw machine|escape room|laser tag|trampoline|trampoline park|sky zone|urban air|minigolf|mini golf|amusement|theme park|six flags|disneyland|universal|cinema|theater|theatre|subscription|sub|app store|google play|itunes|prime|amazon prime|xbox|playstation|nintendo|switch|ps5|ps4|photobooth|photo booth|photo strip|carnival|fair|festival|museum|zoo|aquarium|park|attraction|ride|rollercoaster|go kart|go-kart|paintball|axe throwing|pottery|ceramics|craft|art class|comedy|standup|karaoke|skating|ice skating|roller skating|laser|vr|virtual reality|paddleboarding|kayak|hiking|climbing|bouldering|axe|escape)\b/i },
    { id: 'transport', re: /\b(uber|lyft|bus|train|subway|metro|transit|taxi|cab|gas|fuel|parking|toll|mta|bart|caltrain|scooter|bird|lime|transport|ride|fare|commute|flight|plane|amtrak|greyhound|charter|carpool|rideshare|via|zipcar|rental car|car wash|oil change|tires|auto)\b/i },
    { id: 'gifts',     re: /\b(gift|present|birthday|christmas|holiday|xmas|donation|donate|charity|tip|gave away|giving|for mom|for dad|for sister|for brother|for friend|for boyfriend|for girlfriend|for grandma|for grandpa|valentines|anniversary|graduation|congratulations)\b/i },
    { id: 'school',    re: /\b(school|class|textbook|book|notebook|pencil|pen|backpack|supply|supplies|tuition|fee|course|exam|test|study|homework|college|university|teacher|tutoring|calculator|binder|folder|staples|office depot|michaels craft|glue|marker|highlighter|printer|paper|index card|flash card|SAT|ACT|AP exam|college board)\b/i },
    { id: 'beauty',    re: /\b(hair|haircut|salon|spa|nails|nail|gel nails|acrylic|makeup|cosmetic|skincare|lotion|serum|moisturizer|shampoo|conditioner|face wash|body wash|perfume|cologne|deodorant|ulta|sephora|beauty|wax|lash|lashes|eyebrow|brow|massage|manicure|pedicure|tanning|spray tan|laser|lip gloss|mascara|foundation|concealer|blush|bronzer|contour|eyeshadow|eyeliner|setting spray|toner|sunscreen|spf|chapstick|lip balm|razor|shaving|body scrub|bath bomb|candle|diffuser)\b/i },
  ];

  function guessCategory(text) {
    for (const rule of CAT_RULES) {
      if (rule.re.test(text)) return rule.id;
    }
    return 'ent'; // default for unrecognized purchases
  }

  // ─── account guesser ──────────────────────────────────────────────────────

  function guessAccount(text) {
    const t = text.toLowerCase();
    if (/\b(apple cash|apple|venmo|zelle|paypal|cashapp|cash app|card|debit|phone)\b/.test(t)) return ACCOUNTS[0].id;
    if (/\b(cash|bill|coin|wallet|physical)\b/.test(t)) return ACCOUNTS[ACCOUNTS.length - 1].id;
    return ACCOUNTS[0].id;
  }

  // ─── merchant name extractor ──────────────────────────────────────────────

  const STOPWORDS = new Set([
    'a','an','the','at','in','on','for','to','from','with','and','or',
    'i','my','me','we','it','this','that','some','few','couple',
    'spent','bought','paid','got','received','earn','cost','ordered',
    'today','yesterday','monday','tuesday','wednesday','thursday','friday','saturday','sunday',
    'last','this','next','morning','afternoon','evening','night','week','month',
    'dollar','dollars','buck','bucks','cent','cents',
    'like','just','also','too','very','really','kind','of',
  ]);

  function extractMerchant(chunk, amountIndex) {
    // Remove the amount token
    let s = chunk.replace(/\$\s*\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s*(?:dollar|buck|cent)s?/gi, ' ').trim();
    // Remove common filler
    s = s.replace(/\b(at|from|to|for|on|the|a|an|some|also)\b/gi, ' ').replace(/\s{2,}/g, ' ').trim();
    // Split into words, filter stopwords and short tokens
    const words = s.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));
    if (words.length === 0) return 'Purchase';
    // Take first 3 meaningful words and title-case
    return words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  // ─── sentence splitter ────────────────────────────────────────────────────

  // Split on "and", "also", "plus", commas between transaction mentions
  function splitSentences(text) {
    // Split on ", and ", " and ", " also ", " plus ", ";" — but only if there's an amount on each side
    const chunks = text.split(/\s*(?:,\s*(?:and|also|plus)\s*|,\s+(?=\$|\d)|(?<!\brice\b|\bmac\b|\bcheese\b)\s+and\s+(?=\$|\d|i\s|spent|bought|paid|got|received|earned)|;\s*)/i);
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
  }

  // ─── main parse function ──────────────────────────────────────────────────

  function parseTransactions(text) {
    const dateStr = parseDate(text);
    const chunks  = splitSentences(text);
    const results = [];

    for (const chunk of chunks) {
      const amounts = extractAmounts(chunk);
      if (amounts.length === 0) continue;

      for (const { amount, index } of amounts) {
        if (isNaN(amount) || amount <= 0) continue;

        const type     = detectType(chunk);
        const category = guessCategory(chunk);
        const account  = guessAccount(chunk);
        const note     = extractMerchant(chunk, index);
        const now      = Date.now();

        results.push({
          id: `ai-${now}-${results.length}`,
          date: dateStr,
          amount,
          type,
          category,
          note,
          account,
          auto: false,
        });
      }
    }

    return results;
  }

  // ─── correction parser ────────────────────────────────────────────────────

  const CATEGORY_NAMES = {
    food: ['food','eating','restaurant','drink','drinks','snack','snacks','groceries','grocery'],
    clothes: ['clothes','clothing','fashion','outfit','shoes','shirt','pants','shopping'],
    ent: ['entertainment','ent','fun','activity','activities','game','games','movie','movies','event'],
    transport: ['transport','transportation','travel','uber','lyft','bus','ride'],
    gifts: ['gift','gifts','present','presents','donation'],
    school: ['school','education','supplies','books'],
    beauty: ['beauty','makeup','skincare','salon','nails','hair','spa'],
  };

  function applyCorrection(txs, text) {
    const t = text.toLowerCase();
    let updated = txs.map(tx => ({ ...tx }));
    let changed = [];

    // Category correction — "change to beauty", "it's food", "that's entertainment", "put it under transport"
    for (const [catId, names] of Object.entries(CATEGORY_NAMES)) {
      if (names.some(n => t.includes(n))) {
        updated = updated.map(tx => ({ ...tx, category: catId }));
        changed.push(`category → ${catId}`);
        break;
      }
    }

    // Type correction — "it's income", "that was income / expense"
    if (/\b(income|earned|received|got paid|allowance)\b/.test(t)) {
      updated = updated.map(tx => ({ ...tx, type: 'income' }));
      changed.push('type → income');
    } else if (/\b(expense|spent|bought|paid)\b/.test(t)) {
      updated = updated.map(tx => ({ ...tx, type: 'expense' }));
      changed.push('type → expense');
    }

    // Date correction — any date pattern in correction
    const hasAmount = extractAmounts(text).length > 0;
    if (!hasAmount) {
      const newDate = parseDate(text);
      const today = new Date(); today.setHours(0,0,0,0);
      const todayStr = isoDate(today);
      if (newDate !== todayStr || /\btoday\b/.test(t)) {
        updated = updated.map(tx => ({ ...tx, date: newDate }));
        changed.push(`date → ${newDate}`);
      }
    }

    // Name/note correction — "call it X", "name it X", "it's called X", "actually X"
    const nameMatch = text.match(/(?:call(?:ed)? it|name it|it'?s? (?:called|from|at)?|rename to|actually|the name is|merchant is|store is)\s+([A-Za-z0-9 &']+?)(?:\s*$|[.,!?])/i);
    if (nameMatch) {
      const newNote = nameMatch[1].trim();
      if (newNote.length > 1) {
        updated = updated.map(tx => ({ ...tx, note: newNote.charAt(0).toUpperCase() + newNote.slice(1) }));
        changed.push(`name → ${newNote}`);
      }
    }

    return { updated, changed };
  }

  // ─── category color helper ────────────────────────────────────────────────

  function catColor(catId) {
    const c = CATEGORIES.find(x => x.id === catId);
    return c ? c.color : 'var(--ink-3)';
  }

  // ─── bubble ──────────────────────────────────────────────────────────────

  function Bubble({ role, text }) {
    return e('div', {
      style: {
        alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        padding: '10px 14px',
        borderRadius: role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        background: role === 'user' ? 'var(--accent)' : 'var(--card-2)',
        color: role === 'user' ? '#fff' : 'var(--ink-1)',
        fontSize: 14,
        lineHeight: 1.5,
      }
    }, text);
  }

  // ─── pending transaction card ─────────────────────────────────────────────

  function TxPreview({ txs, onConfirm, onDiscard }) {
    return e('div', {
      style: {
        border: '1.5px solid var(--accent)',
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 4,
      }
    },
      e('div', { style: {
        padding: '8px 14px 7px',
        background: 'var(--card-2)',
        borderBottom: '1px solid var(--hairline)',
      } },
        e('span', { style: { fontSize: 11.5, fontWeight: 660, color: 'var(--accent)', letterSpacing: '0.04em' } },
          `✦ ${txs.length} TRANSACTION${txs.length > 1 ? 'S' : ''} TO ADD`
        )
      ),

      txs.map((t, i) =>
        e('div', {
          key: i,
          style: {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px',
            borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
          }
        },
          e('div', { style: {
            width: 9, height: 9, borderRadius: '50%',
            background: catColor(t.category), flexShrink: 0,
          }}),
          e('div', { style: { flex: 1, minWidth: 0 } },
            e('div', { style: { fontSize: 14, fontWeight: 580, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t.note),
            e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2 } },
              `${t.date} · ${t.category}`
            )
          ),
          e('span', {
            style: {
              fontSize: 14.5, fontWeight: 660, flexShrink: 0,
              color: t.type === 'income' ? 'var(--good)' : 'var(--ink-1)',
            }
          }, (t.type === 'income' ? '+' : '−') + '$' + t.amount.toFixed(2))
        )
      ),

      e('div', { style: { display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--card-2)', borderTop: '1px solid var(--hairline)' } },
        e('button', {
          className: 'btn btn-primary',
          style: { flex: 1, padding: '9px 0', fontSize: 13.5 },
          onClick: onConfirm,
        }, `Add ${txs.length > 1 ? `${txs.length} transactions` : 'transaction'}`),
        e('button', {
          className: 'btn btn-ghost',
          style: { padding: '9px 16px', fontSize: 13.5 },
          onClick: onDiscard,
        }, 'Discard')
      )
    );
  }

  // ─── example chips ────────────────────────────────────────────────────────

  const EXAMPLES = [
    'spent $12 at Starbucks today',
    'got $50 allowance yesterday',
    'bought $9.99 Spotify and $4 coffee',
    'paid $3.50 for the bus last Friday',
  ];

  function ExampleChip({ text, onClick }) {
    return e('button', {
      onClick: () => onClick(text),
      style: {
        fontSize: 12.5, padding: '6px 12px', borderRadius: 99,
        background: 'var(--card-2)', color: 'var(--ink-2)',
        border: '1px solid var(--hairline-strong)',
        whiteSpace: 'nowrap', fontWeight: 520,
        cursor: 'pointer',
      }
    }, text);
  }

  // ─── main panel ──────────────────────────────────────────────────────────

  function AssistantPanel({ onClose, onImport }) {
    const [messages, setMessages] = React.useState([{
      role: 'assistant',
      text: "Hey! Describe your spending or income and I'll log it for you. No account needed — it all runs right here in the app.",
    }]);
    const [pending, setPending] = React.useState(null);
    const [input, setInput] = React.useState('');
    const [showExamples, setShowExamples] = React.useState(true);
    const bottomRef  = React.useRef(null);
    const inputRef   = React.useRef(null);

    React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
    React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, pending]);

    const addMsg = (role, text) => setMessages(prev => [...prev, { role, text }]);

    const send = (raw) => {
      const text = (raw || input).trim();
      if (!text) return;
      setInput('');
      setShowExamples(false);
      setPending(null);
      addMsg('user', text);

      // small fake "thinking" delay for feel
      setTimeout(() => {
        const txs = parseTransactions(text);

        if (txs.length === 0) {
          // No amount found — try applying as a correction if something is pending
          if (pending) {
            const { updated, changed } = applyCorrection(pending, text);
            if (changed.length > 0) {
              setPending(updated);
              addMsg('assistant', `Updated! (${changed.join(', ')}) — still look good?`);
            } else {
              addMsg('assistant', "I couldn't figure out what to change. Try saying something like \"change to beauty\", \"the date was 7/5\", or \"call it Ulta\".");
            }
          } else {
            addMsg('assistant', "Hmm, I couldn't find an amount in there. Try something like \"spent $8 on lunch\".");
          }
        } else {
          setPending(txs);
          addMsg('assistant',
            txs.length === 1
              ? "Got it! Here's what I parsed — look good?"
              : `Found ${txs.length} transactions — does this look right?`
          );
        }
      }, 320);
    };

    const confirm = () => {
      if (!pending) return;
      onImport(pending);
      const count = pending.length;
      setPending(null);
      addMsg('assistant', `Added ${count} transaction${count > 1 ? 's' : ''}! ✓ What else?`);
    };

    const discard = () => {
      setPending(null);
      addMsg('assistant', 'Discarded. Try describing it differently if something was off.');
    };

    return e('div', {
      className: 'scrim',
      onMouseDown: ev => { if (ev.target === ev.currentTarget) onClose(); }
    },
      e('div', { className: 'sheet', style: { height: '82dvh', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', padding: 0 } },

        // header
        e('div', { className: 'sheet-head', style: { padding: '22px 22px 0' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
            e('span', { style: { fontSize: 18, lineHeight: 1 } }, '✦'),
            e('h3', null, 'AI Assistant'),
          ),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' },
            e(Icon, { name: 'close', size: 17 })
          )
        ),

        // chat
        e('div', {
          style: {
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            gap: 8, padding: '12px 22px 4px', minHeight: 0,
            WebkitOverflowScrolling: 'touch',
          }
        },
          messages.map((m, i) => e(Bubble, { key: i, role: m.role, text: m.text })),

          showExamples && e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 } },
            EXAMPLES.map(ex => e(ExampleChip, { key: ex, text: ex, onClick: send }))
          ),

          e('div', { ref: bottomRef })
        ),

        // bottom section — never compressed by flex
        e('div', { style: { flexShrink: 0 } },
          pending && e(TxPreview, { txs: pending, onConfirm: confirm, onDiscard: discard }),

          // input row
          e('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 22px 22px', borderTop: '1px solid var(--hairline)' } },
          e('textarea', {
            ref: inputRef,
            value: input,
            onChange: ev => setInput(ev.target.value),
            onKeyDown: ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(); } },
            placeholder: 'e.g. "spent $12 at McDonald\'s today"',
            rows: 2,
            style: {
              flex: 1, resize: 'none', borderRadius: 12,
              padding: '10px 14px', fontSize: 14,
              border: '1.5px solid var(--hairline-strong)',
              background: 'var(--card-2)', color: 'var(--ink-1)',
              lineHeight: 1.4, fontFamily: 'inherit', outline: 'none',
            },
          }),
          e('button', {
            className: 'btn btn-primary',
            style: { padding: '11px 14px', borderRadius: 12, flexShrink: 0, alignSelf: 'flex-end' },
            onClick: () => send(),
            disabled: !input.trim(),
          }, e(Icon, { name: 'arrowUp', size: 18 }))
        )
        ) // end bottom section
      )
    );
  }

  window.AssistantPanel = AssistantPanel;
})();
