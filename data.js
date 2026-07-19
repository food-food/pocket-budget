/* data.js — model, config, storage, date + money helpers */
'use strict';

const CATEGORIES = [
  { id: 'food',      label: 'Food & Drink',  icon: 'food',      color: 'var(--c-food)' },
  { id: 'clothes',   label: 'Clothes',       icon: 'clothes',   color: 'var(--c-clothes)' },
  { id: 'ent',       label: 'Entertainment', icon: 'ent',       color: 'var(--c-ent)' },
  { id: 'transport', label: 'Transport',     icon: 'transport', color: 'var(--c-transport)' },
  { id: 'gifts',     label: 'Gifts',         icon: 'gifts',     color: 'var(--c-gifts)' },
  { id: 'school',    label: 'School',        icon: 'school',    color: 'var(--c-school)' },
  { id: 'beauty',    label: 'Beauty',        icon: 'beauty',    color: 'var(--c-beauty)' },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const ACCOUNTS = [
  { id: 'apple', label: 'Apple Cash', icon: 'apple', color: '#000000' },
  { id: 'cash',  label: 'Cash',       icon: 'cash',  color: 'var(--good)' },
];
const ACCT = Object.fromEntries(ACCOUNTS.map(a => [a.id, a]));

// ---------- money ----------
function fmt(n, { cents = true, sign = false } = {}) {
  const neg = n < 0;
  const v = Math.abs(n);
  const s = v.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const out = '$' + s;
  if (sign) return (neg ? '−' : '+') + out;
  return (neg ? '−' : '') + out;
}

// ---------- dates ----------
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function dayLabel(iso) {
  const d = parseISO(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${MON_ABBR[d.getMonth()]} ${d.getDate()}`;
}

function monthRange(year, month) {
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) };
}
function ytdRange(year) {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
}
function inRange(iso, range) {
  const d = parseISO(iso).getTime();
  return d >= range.start.getTime() && d <= new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate(), 23, 59, 59).getTime();
}

const ymOf = (iso) => iso.slice(0, 7);
const currentYM = () => isoDate(new Date()).slice(0, 7);
function* monthsBetween(startYM, endYM) {
  let [y, m] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    yield `${y}-${pad(m)}`;
    m++; if (m > 12) { m = 1; y++; }
  }
}

// ---------- settings ----------
function defaultSettings() {
  return {
    allowance: { enabled: false, amount: 0, account: 'apple', start: currentYM() },
    savingsGoal: 0,
    categoryBudgets: [], // [{id, category, label, amount, period:'year'|'month'}]
  };
}

// Returns how much has been spent in a category budget given all transactions
function categoryBudgetSpent(budget, allTx) {
  const now = new Date();
  return allTx
    .filter(tx => {
      if (tx.type !== 'expense') return false;
      if (tx.category !== budget.category) return false;
      const d = parseISO(tx.date);
      if (budget.period === 'year')  return d.getFullYear() === now.getFullYear();
      if (budget.period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      return false;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

// ---------- storage ----------
const KEY = 'budgetapp.v1';
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.settings = Object.assign(defaultSettings(), s.settings || {});
      s.transactions = s.transactions || [];
      return s;
    }
  } catch (e) {}
  return { transactions: [], settings: defaultSettings() };
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify({ transactions: state.transactions, settings: state.settings })); } catch (e) {}
}

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- auto savings reconciliation ----------
// savings for month M = cumulative balance at end of M - cumulative balance at end of M-1
// where cumulative balance = sum of all (income - expense) up to that point.
// Savings transactions themselves do NOT affect balance — they are just records of growth.
// A manual savings entry (id not starting with 'auto-savings-') for a month overrides the auto one.
function reconcileSavings(transactions) {
  const thisYM = currentYM();

  const nonAutoTx = transactions.filter(t => !(t.id || '').startsWith('auto-savings-'));
  const incomeTx = nonAutoTx.filter(t => t.type === 'income' || t.type === 'expense');
  if (incomeTx.length === 0) return { transactions, changed: false };

  const allYMs = incomeTx.map(t => ymOf(t.date)).sort();
  const firstYM = allYMs[0];

  // Months that have a manual savings override
  const manualSavingsMonths = new Set(
    nonAutoTx.filter(t => t.type === 'savings').map(t => ymOf(t.date))
  );

  // Cumulative balance at end of each month (income - expense only)
  const netByMonth = {};
  incomeTx.forEach(t => {
    const k = ymOf(t.date);
    netByMonth[k] = (netByMonth[k] || 0) + (t.type === 'income' ? t.amount : -t.amount);
  });

  const months = [];
  for (const ym of monthsBetween(firstYM, thisYM)) months.push(ym);

  let runningBalance = 0;
  const autoMap = {};
  for (const ym of months) {
    const prevBalance = runningBalance;
    runningBalance += netByMonth[ym] || 0;
    if (ym >= thisYM) continue; // current month not yet complete
    if (manualSavingsMonths.has(ym)) continue; // user overrode this month
    const delta = runningBalance - prevBalance;
    if (delta > 0) autoMap[ym] = Math.round(delta * 100) / 100;
  }

  const keep = transactions.filter(t => !(t.id || '').startsWith('auto-savings-'));
  const autoTx = Object.entries(autoMap).map(([ym, amount]) => ({
    id: `auto-savings-${ym}`,
    type: 'savings',
    amount,
    account: 'apple',
    note: 'Auto-saved',
    date: `${ym}-28`,
    auto: true,
  }));

  const prev = transactions.filter(t => (t.id || '').startsWith('auto-savings-'));
  const changed = prev.length !== autoTx.length ||
    autoTx.some(na => { const old = prev.find(o => o.id === na.id); return !old || old.amount !== na.amount; });

  return { transactions: [...keep, ...autoTx].sort((a, b) => b.date.localeCompare(a.date)), changed };
}

// ---------- derived balances ----------
// Savings transactions are informational records of balance growth — they do not
// subtract from the spendable balance (which is income minus expenses).
function deriveBalances(transactions) {
  const b = { apple: 0, cash: 0 };
  transactions.forEach(t => {
    if (t.type === 'income') b[t.account] += t.amount;
    else if (t.type === 'expense') b[t.account] -= t.amount;
  });
  return b;
}

// ---------- recurring allowance reconciliation ----------
function reconcileAllowance(transactions, settings) {
  const a = settings.allowance || {};
  const keep = transactions.filter(t => !(t.id || '').startsWith('auto-allow-'));
  if (!a.enabled) {
    return { transactions: keep, changed: keep.length !== transactions.length };
  }
  const start = a.start || currentYM();
  const auto = [];
  for (const ym of monthsBetween(start, currentYM())) {
    auto.push({ id: `auto-allow-${ym}`, type: 'income', amount: a.amount,
      account: a.account, note: 'Allowance', date: `${ym}-01`, auto: true });
  }
  const next = [...keep, ...auto].sort((x, y) => y.date.localeCompare(x.date));
  const prevAuto = transactions.filter(t => (t.id || '').startsWith('auto-allow-'));
  const changed = prevAuto.length !== auto.length ||
    auto.some(na => { const old = prevAuto.find(o => o.id === na.id); return !old || old.amount !== na.amount || old.account !== na.account; });
  return { transactions: next, changed };
}

// ---------- sample data ----------
function sampleData() {
  const tx = [];
  const today = new Date();
  const Y = today.getFullYear();
  const merchants = {
    food: ['Chipotle','Starbucks','Boba Guys','School Cafeteria','7-Eleven','Sweetgreen','Domino\'s'],
    clothes: ['Urban Outfitters','Nike','Depop','Uniqlo','Brandy Melville'],
    ent: ['Spotify','AMC Theatres','Steam','Roblox','Concert Ticket','Netflix'],
    transport: ['Uber','Metro Card','Gas','Lyft','Bird Scooter'],
    gifts: ['Mom\'s Birthday','Amazon Gift','Sephora Gift'],
    school: ['Bookstore','Notebooks','Field Trip','Art Supplies'],
    beauty: ['Sephora','Ulta','Glossier','Haircut'],
  };
  const cats = Object.keys(merchants);
  tx.push({ id: uid(), type: 'income', amount: 120, account: 'cash', note: 'Birthday money', date: isoDate(new Date(Y, 0, 1)) });
  for (let m = 0; m <= today.getMonth(); m++) {
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const day = 1 + Math.floor(Math.random() * 27);
      const d = new Date(Y, m, Math.min(day, m === today.getMonth() ? today.getDate() : 28));
      const list = merchants[cat];
      const amt = +(4 + Math.random() * (cat === 'clothes' ? 45 : cat === 'ent' ? 28 : 16)).toFixed(2);
      tx.push({ id: uid(), type: 'expense', amount: amt, category: cat,
        account: Math.random() > 0.45 ? 'apple' : 'cash',
        note: list[Math.floor(Math.random() * list.length)], date: isoDate(d) });
    }
    tx.push({ id: `auto-allow-${Y}-${pad(m + 1)}`, type: 'income', amount: 80, account: 'apple', note: 'Allowance', date: isoDate(new Date(Y, m, 1)), auto: true });
    tx.push({ id: uid(), type: 'income', amount: 60 + Math.floor(Math.random()*60), account: 'cash', note: 'Babysitting', date: isoDate(new Date(Y, m, 14)) });
    tx.push({ id: uid(), type: 'savings', amount: 35 + Math.floor(Math.random()*25), account: 'apple', note: 'Monthly save', date: isoDate(new Date(Y, m, 2)) });
  }
  const settings = defaultSettings();
  settings.allowance.start = `${Y}-01`;
  return { transactions: tx.sort((a,b) => b.date.localeCompare(a.date)), settings };
}

window.Budget = {
  CATEGORIES, CAT, ACCOUNTS, ACCT,
  fmt, MONTHS, MON_ABBR, isoDate, parseISO, dayLabel,
  monthRange, ytdRange, inRange, load, save, uid, sampleData,
  ymOf, currentYM, defaultSettings, deriveBalances, reconcileAllowance, reconcileSavings,
  categoryBudgetSpent,
};
