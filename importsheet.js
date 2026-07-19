/* importsheet.js — Apple Cash PDF statement text importer */
'use strict';

(function () {
  const { isoDate, uid } = window.Budget;
  const Icon = window.Icon;
  const e = React.createElement;

  // ---------- category guesser ----------

  const CAT_RULES = [
    { cat: 'food', terms: ['vending','cafe','coffee','tea','boba','matcha','pizza','burger','sushi','ramen','taco','grill','kitchen','eatery','bistro','diner','restaurant','bar ','pub ','chipotle','starbucks','peets','sweetgreen','domino','mcdonald','shake shack','cheesecake','sharetea','heytea','dduk','h mart','99 ranch','president','trader joe','whole food','safeway','kroger','wegman','market','juice','smoothie','boba','potobox','sidewalk','maples grab','coupa','eataly','silicon valley @sfo','yogurt','lou\'s buns','smith nmah'] },
    { cat: 'ent',   terms: ['cinemark','amc','regal','theater','theatre','movie','concert','ticketmaster','stubhub','spotify','netflix','hulu','steam','roblox','nintendo','playstation','xbox','twitch','disney','universal','six flags','amusement','arcade','kiosoft','stadium','bowlero','topgolf','karaoke','escape room','bowling','paintball'] },
    { cat: 'clothes', terms: ['hollister','urban outfitters','nike','adidas','uniqlo','brandy','depop','h&m','zara','gap','forever21','old navy','levi','pacsun','american eagle','express','forever 21','abercrombie','madewell','j.crew','nordstrom','bloomingdale','macy','k pop','uo '] },
    { cat: 'beauty', terms: ['sephora','ulta','glossier','haircut','salon','spa','beauty','life 4 cuts','life4cuts','supercuts','great clips','nail','lash','wax','skincare','fenty','mac cosmetics','nyx '] },
    { cat: 'transport', terms: ['uber','lyft','suica','metro','transit','scooter','bird ','lime ','mta','bart','caltrain','amtrak','greyhound','bus','train','subway','taxi','cab ','parking','gas ','shell','chevron','exxon','bp ','taoyuan','mt taoyuan','mobile suica'] },
    { cat: 'school', terms: ['bookstore','school','university','stanford','canvas','chegg','amazon textbook','tutor','field trip','art supplies','notebook','staples','office depot'] },
    { cat: 'gifts', terms: ['amazon','target','walmart','best buy','apple store','etsy','ebay','gift','flower','1-800','bouquet','hallmark'] },
  ];

  function guessCategory(note) {
    const lower = note.toLowerCase();
    for (const { cat, terms } of CAT_RULES) {
      if (terms.some(t => lower.includes(t))) return cat;
    }
    return null;
  }

  // ---------- parser ----------

  const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+)$/;
  const DOLLAR_RE = /[+-]?\$[\d,]+\.\d{2}/g;
  const SKIP_RE = /^(Starting Balance|Ending Balance|Money In|Money Out|DATE\s+DESCRIPTION|NAME\s+ACCOUNT|APPLE ID|STATEMENT PERIOD|Summary\s|Copyright|Page \d|SUBTOTAL|In Case|Direct Payment|For Illinois|For Minnesota|For New York|For Texas|After first|The features)/i;
  const HEX_ID_RE = /^[0-9a-f]{12}$/i;

  function parseStatement(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const txs = [];
    let i = 0;

    while (i < lines.length) {
      const m = DATE_RE.exec(lines[i]);
      if (!m) { i++; continue; }

      const [, mo, day, yr, descStart] = m;
      const date = `${yr}-${mo}-${day}`;

      // collect continuation lines until next transaction date or skip line
      const parts = [descStart];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j];
        if (DATE_RE.test(next)) break;
        if (SKIP_RE.test(next)) break;
        parts.push(next);
        j++;
      }

      const tx = extractTransaction(date, parts);
      if (tx) txs.push(tx);
      i = j;
    }

    return txs;
  }

  function extractTransaction(date, parts) {
    // find all dollar amounts across all parts
    const allText = parts.join(' ');
    const amounts = [...allText.matchAll(DOLLAR_RE)].map(m => m[0]);

    // need at least amount + balance
    if (amounts.length < 2) return null;

    // last = balance, second-to-last = transaction amount
    const amtStr = amounts[amounts.length - 2];
    const amt = parseDollar(amtStr);
    if (amt === 0) return null;

    // build description from meaningful parts
    const desc = buildDescription(parts);

    // type: positive = income, negative = expense
    const type = amt > 0 ? 'income' : 'expense';
    const amount = Math.abs(amt);
    const category = type === 'expense' ? (guessCategory(desc) || 'food') : undefined;

    // dedupe key: hash of date + desc + amount
    const dedupeId = `apple-import-${date}-${desc.slice(0,20).replace(/\s/g,'')}-${amount.toFixed(2)}`;

    return { id: dedupeId, type, amount: +amount.toFixed(2), account: 'apple', date, note: desc, category };
  }

  function parseDollar(s) {
    // "+$20.00" → 20, "-$2.40" → -2.4, "$6.19" → 6.19
    const sign = s.startsWith('-') ? -1 : 1;
    return sign * parseFloat(s.replace(/[^0-9.]/g, ''));
  }

  function buildDescription(parts) {
    // Filter out lines that are purely amounts/balance, hex tx IDs, or foreign currency noise
    const filtered = parts.filter(p => {
      if (/^[+-]?\$[\d,]+\.\d{2}/.test(p)) return false;   // pure amount line
      if (HEX_ID_RE.test(p)) return false;                   // hex tx id
      if (/^Total Payment in/.test(p)) return false;         // foreign currency label
      if (/^[+-]?¥/.test(p)) return false;                  // yen amount
      if (/^[+-]?[A-Z]{2,3}[\d,]+/.test(p)) return false;  // other currency
      return true;
    });

    if (!filtered.length) return parts[0] || 'Apple Cash';

    // For "Received from X\n<hex>" → just use "Received from X"
    // For merchant "CINEMARK 440\nMilpitas, CA -$11.90 $25.29" → "CINEMARK 440, Milpitas CA"
    let desc = filtered[0];
    if (filtered.length > 1) {
      // second line is often "City, STATE" — strip trailing amounts
      const loc = filtered[1].replace(/\s*[+-]?\$[\d,]+\.\d{2}.*/g, '').trim();
      if (loc && !HEX_ID_RE.test(loc)) {
        desc = `${desc}, ${loc}`;
      }
    }

    // clean up extra whitespace
    return desc.replace(/\s+/g, ' ').trim();
  }

  // ---------- component ----------

  function ImportSheet({ onClose, onImport, existingIds }) {
    const [text, setText] = React.useState('');
    const [preview, setPreview] = React.useState(null);

    const parse = () => {
      if (!text.trim()) return;
      const parsed = parseStatement(text);
      // filter out already-imported ones
      const fresh = parsed.filter(t => !existingIds.has(t.id));
      const dupes = parsed.length - fresh.length;
      setPreview({ txs: fresh, dupes, total: parsed.length });
    };

    const doImport = () => {
      if (!preview) return;
      onImport(preview.txs);
      onClose();
    };

    const typeColor = (type) => type === 'income' ? 'var(--good)' : 'var(--bad)';
    const fmt = window.Budget.fmt;

    return e('div', { className: 'scrim', onMouseDown: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet', style: { width: 'min(560px, 100%)' } },
        e('div', { className: 'sheet-head' },
          e('h3', null, 'Import Apple Cash'),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
        ),

        !preview
          ? e(React.Fragment, null,
              e('p', { style: { fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 14px' } },
                'Open your Apple Cash statement PDF, press ', e('strong', null, '⌘A'), ' then ', e('strong', null, '⌘C'),
                ' to copy all text, then paste it below.'
              ),
              e('textarea', {
                style: {
                  width: '100%', height: 200, padding: '12px 14px', borderRadius: 13,
                  background: 'var(--card-2)', border: '1.5px solid transparent',
                  fontSize: 13, fontFamily: 'monospace', color: 'var(--ink)',
                  resize: 'vertical', outline: 'none',
                },
                placeholder: 'Paste statement text here…',
                value: text,
                onChange: (ev) => { setText(ev.target.value); setPreview(null); },
                onFocus: (ev) => { ev.target.style.borderColor = 'var(--accent)'; ev.target.style.background = 'var(--bg-elevated)'; },
                onBlur: (ev) => { ev.target.style.borderColor = 'transparent'; ev.target.style.background = 'var(--card-2)'; },
              }),
              e('button', {
                className: 'btn btn-primary',
                style: { width: '100%', marginTop: 14, padding: 14 },
                disabled: !text.trim(),
                onClick: parse,
              }, e(Icon, { name: 'list', size: 17 }), ' Parse transactions')
            )
          : e(React.Fragment, null,
              // summary bar
              e('div', { style: { background: 'var(--card-2)', borderRadius: 13, padding: '14px 16px', marginBottom: 14 } },
                e('div', { style: { fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em' } },
                  `${preview.txs.length} transaction${preview.txs.length !== 1 ? 's' : ''} ready to import`
                ),
                preview.dupes > 0 && e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 3 } },
                  `${preview.dupes} already imported — skipped`
                ),
                preview.txs.length === 0 && e('div', { style: { fontSize: 13, color: 'var(--ink-3)', marginTop: 3 } },
                  'Nothing new to import.'
                )
              ),

              // preview list (up to 12)
              preview.txs.length > 0 && e('div', { style: { maxHeight: 300, overflowY: 'auto', borderRadius: 13, border: '1px solid var(--hairline)' } },
                preview.txs.slice(0, 12).map((tx, i) =>
                  e('div', {
                    key: i,
                    style: {
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                      borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
                    }
                  },
                    e('div', { style: { flex: 1, minWidth: 0 } },
                      e('div', { style: { fontSize: 14, fontWeight: 580, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tx.note),
                      e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 6 } },
                        tx.date,
                        tx.category && e('span', { style: { background: 'var(--card-2)', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 600 } },
                          window.Budget.CAT[tx.category]?.label || tx.category
                        )
                      )
                    ),
                    e('span', { style: { fontSize: 14, fontWeight: 640, color: typeColor(tx.type), flex: 'none' } },
                      (tx.type === 'income' ? '+' : '−') + fmt(tx.amount)
                    )
                  )
                ),
                preview.txs.length > 12 && e('div', { style: { padding: '10px 14px', fontSize: 13, color: 'var(--ink-3)', borderTop: '1px solid var(--hairline)' } },
                  `…and ${preview.txs.length - 12} more`
                )
              ),

              // actions
              e('div', { style: { display: 'flex', gap: 10, marginTop: 16 } },
                e('button', { className: 'btn', style: { flex: 1 }, onClick: () => setPreview(null) }, 'Back'),
                preview.txs.length > 0 && e('button', { className: 'btn btn-primary', style: { flex: 2 }, onClick: doImport },
                  e(Icon, { name: 'arrowDown', size: 16 }), ` Import ${preview.txs.length} transactions`
                )
              )
            )
      )
    );
  }

  window.ImportSheet = ImportSheet;
  window._parseAppleCashStatement = parseStatement; // exposed for testing
})();
