/* selectors.js — pure data computations for the views */
'use strict';

(function () {
  const { CAT, CATEGORIES, inRange, parseISO, MON_ABBR, isoDate } = window.Budget;

  function filterTx(all, range) {
    return all.filter(t => inRange(t.date, range));
  }

  function totals(list) {
    let spent = 0, income = 0, saved = 0;
    list.forEach(t => {
      if (t.type === 'expense') spent += t.amount;
      else if (t.type === 'income') income += t.amount;
      else if (t.type === 'savings') saved += t.amount;
    });
    return { spent, income, saved, count: list.length };
  }

  function spendByCategory(list) {
    const map = {};
    list.forEach(t => { if (t.type === 'expense') map[t.category] = (map[t.category] || 0) + t.amount; });
    return CATEGORIES
      .map(c => ({ id: c.id, label: c.label, color: c.color, icon: c.icon, value: map[c.id] || 0 }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }

  function trendBuckets(list, filter, range) {
    const exp = list.filter(t => t.type === 'expense');
    if (filter.mode === 'month') {
      const buckets = [
        { label: '1–7', value: 0 }, { label: '8–14', value: 0 },
        { label: '15–21', value: 0 }, { label: '22–28', value: 0 }, { label: '29+', value: 0 },
      ];
      exp.forEach(t => { const d = parseISO(t.date).getDate(); buckets[Math.min(4, Math.floor((d - 1) / 7))].value += t.amount; });
      return buckets;
    }
    if (filter.mode === 'ytd') {
      const upto = (filter.year === new Date().getFullYear()) ? new Date().getMonth() : 11;
      const buckets = [];
      for (let m = 0; m <= upto; m++) buckets.push({ label: MON_ABBR[m], value: 0 });
      exp.forEach(t => { const m = parseISO(t.date).getMonth(); if (buckets[m]) buckets[m].value += t.amount; });
      return buckets;
    }
    const days = Math.round((range.end - range.start) / 86400000) + 1;
    if (days <= 31) {
      const buckets = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(range.start); d.setDate(d.getDate() + i);
        buckets.push({ label: days <= 10 ? `${d.getMonth()+1}/${d.getDate()}` : String(d.getDate()), value: 0, _iso: isoDate(d) });
      }
      const idx = Object.fromEntries(buckets.map((b, i) => [b._iso, i]));
      exp.forEach(t => { const i = idx[t.date]; if (i != null) buckets[i].value += t.amount; });
      return buckets;
    }
    const buckets = [];
    const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cur <= range.end) { buckets.push({ label: MON_ABBR[cur.getMonth()], value: 0, _key: `${cur.getFullYear()}-${cur.getMonth()}` }); cur.setMonth(cur.getMonth() + 1); }
    const idx = Object.fromEntries(buckets.map((b, i) => [b._key, i]));
    exp.forEach(t => { const d = parseISO(t.date); const i = idx[`${d.getFullYear()}-${d.getMonth()}`]; if (i != null) buckets[i].value += t.amount; });
    return buckets;
  }

  function savingsSeries(all) {
    // Savings = running account balance (income - expense) over time, shown month by month.
    // We use the auto-savings records (which store the month-end delta) to reconstruct
    // the cumulative balance chart. Manual savings entries are also included.
    const savingsTx = all.filter(t => t.type === 'savings').sort((a, b) => a.date.localeCompare(b.date));
    if (!savingsTx.length) return { points: [], total: 0 };

    // Group by month, keeping only the latest entry per month (manual overrides auto)
    const byMonth = {};
    savingsTx.forEach(t => {
      const k = t.date.slice(0, 7);
      // manual entry wins over auto
      if (!byMonth[k] || byMonth[k].auto) byMonth[k] = t;
    });

    const keys = Object.keys(byMonth).sort();
    let cum = 0;
    const points = keys.map(k => {
      cum += byMonth[k].amount;
      const [, m] = k.split('-').map(Number);
      return { label: MON_ABBR[m - 1], value: cum };
    });
    if (points.length === 1) points.unshift({ label: '', value: 0 });
    return { points, total: cum };
  }

  window.Selectors = { filterTx, totals, spendByCategory, trendBuckets, savingsSeries };
})();
