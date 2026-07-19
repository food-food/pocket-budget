/* transactions.js — full ledger, grouped by day, with filters + delete */
'use strict';

(function () {
  const { CAT, CATEGORIES, ACCT, fmt, parseISO, MON_ABBR } = window.Budget;
  const Icon = window.Icon, Badge = window.Badge;
  const e = React.createElement;

  function dayHeading(iso) {
    const d = parseISO(iso);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((today - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return `${wd}, ${MON_ABBR[d.getMonth()]} ${d.getDate()}`;
  }

  function Row({ tx, onDelete, onEdit }) {
    const isExp = tx.type === 'expense';
    const cat = isExp ? CAT[tx.category] : null;
    const meta = tx.type === 'savings' ? { color: 'var(--accent)', icon: 'savings', label: 'Savings deposit' }
      : tx.type === 'income' ? { color: 'var(--good)', icon: 'arrowDown', label: 'Income' }
      : { color: cat.color, icon: cat.icon, label: cat.label };
    return e('div', { className: 'tx' },
      e(Badge, { color: meta.color, icon: meta.icon }),
      e('div', { style: { minWidth: 0, flex: 1 } },
        e('div', { className: 'nm' }, tx.note || meta.label),
        e('div', { className: 'sub' },
          isExp ? cat.label : meta.label, ' ',
          e('span', { className: 'acct-chip' }, ACCT[tx.account].label),
          tx.auto && e('span', { className: 'acct-chip auto' }, 'Recurring')
        )
      ),
      e('span', { className: 'amt tnum' + (tx.type === 'income' ? ' in' : '') },
        (tx.type === 'income' ? '+' : '−') + fmt(tx.amount)
      ),
      e('button', { className: 'tx-del', onClick: () => onEdit(tx), 'aria-label': 'Edit', title: 'Edit' },
        e(Icon, { name: 'pencil', size: 14 })
      ),
      tx.auto
        ? e('span', { className: 'tx-del', style: { opacity: 0.5 }, title: 'Recurring allowance — manage in Settings' },
            e(Icon, { name: 'repeat', size: 15 })
          )
        : e('button', { className: 'tx-del', onClick: () => onDelete(tx.id), 'aria-label': 'Delete' },
            e(Icon, { name: 'trash', size: 16 })
          )
    );
  }

  function Transactions({ filtered, catFilter, setCatFilter, onDelete, onEdit }) {
    const [acctFilter, setAcctFilter] = React.useState('all');

    let list = filtered;
    if (catFilter && catFilter !== 'all') list = list.filter(t => t.type === 'expense' && t.category === catFilter);
    if (acctFilter !== 'all') list = list.filter(t => t.account === acctFilter);

    const groups = [];
    const byDay = {};
    list.forEach(t => { (byDay[t.date] = byDay[t.date] || []).push(t); });
    Object.keys(byDay).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const items = byDay[date];
      const dayTotal = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
      groups.push({ date, items, dayTotal });
    });

    return e('div', { className: 'grid' },
      // category filter pills
      e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
        e('div', { className: 'chips' },
          e('button', {
            className: 'chip' + ((!catFilter || catFilter === 'all') ? ' on' : ''),
            style: (!catFilter || catFilter === 'all') ? { color: 'var(--accent)' } : null,
            onClick: () => setCatFilter('all'),
          }, e('span', { style: { color: 'var(--ink-2)' } }, 'All categories')),
          CATEGORIES.map(c =>
            e('button', {
              key: c.id,
              className: 'chip' + (catFilter === c.id ? ' on' : ''),
              style: catFilter === c.id ? { color: c.color } : null,
              onClick: () => setCatFilter(c.id),
            },
              e('span', { className: 'dot', style: { background: c.color } }),
              e('span', { style: { color: 'var(--ink-2)' } }, c.label)
            )
          )
        )
      ),
      // account filter pills
      e('div', { className: 'chips', style: { marginTop: -6 } },
        [['all','All accounts'], ['apple','Apple Cash'], ['cash','Cash']].map(([k, l]) =>
          e('button', {
            key: k,
            className: 'chip' + (acctFilter === k ? ' on' : ''),
            style: acctFilter === k ? { color: 'var(--accent)' } : null,
            onClick: () => setAcctFilter(k),
          }, e('span', { style: { color: 'var(--ink-2)' } }, l))
        )
      ),
      // transaction groups
      groups.length === 0
        ? e('div', { className: 'card' },
            e('div', { className: 'empty', style: { padding: '40px 12px' } },
              e('div', { className: 'ring' }, e(Icon, { name: 'list', size: 24 })),
              e('h4', null, 'No transactions'),
              e('p', { style: { marginBottom: 0 } }, 'Nothing matches these filters in the selected dates.')
            )
          )
        : groups.map(g =>
            e('div', { className: 'card', key: g.date, style: { paddingTop: 14, paddingBottom: 6 } },
              e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 } },
                e('span', { style: { fontSize: 13, fontWeight: 680, color: 'var(--ink-2)', letterSpacing: '-0.01em' } }, dayHeading(g.date)),
                e('span', { className: 'tnum', style: { fontSize: 12.5, fontWeight: 620, color: g.dayTotal >= 0 ? 'var(--good)' : 'var(--ink-3)' } },
                  (g.dayTotal >= 0 ? '+' : '−') + fmt(Math.abs(g.dayTotal))
                )
              ),
              g.items.map(tx => e(Row, { key: tx.id, tx, onDelete, onEdit }))
            )
          )
    );
  }

  window.Transactions = Transactions;
})();
