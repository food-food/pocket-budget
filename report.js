/* report.js — monthly spending report sheet */
'use strict';

(function () {
  const { CATEGORIES, CAT, fmt, MONTHS, isoDate, parseISO, monthRange } = window.Budget;
  const Icon = window.Icon, Badge = window.Badge;
  const e = React.createElement;

  function ReportSheet({ allTx, settings, onClose }) {
    const now = new Date();
    // default to previous month
    const initMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const initYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const [year,  setYear]  = React.useState(initYear);
    const [month, setMonth] = React.useState(initMonth);

    const range = monthRange(year, month);
    const label = `${MONTHS[month]} ${year}`;

    // filter transactions for this month
    const monthTx = allTx.filter(tx => {
      const d = parseISO(tx.date);
      return d >= range.start && d <= range.end;
    });

    const income  = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const spent   = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const net     = income - spent;

    // spending by category
    const catMap = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const catRows = Object.entries(catMap)
      .map(([id, total]) => ({ id, total, cat: CAT[id] }))
      .filter(r => r.cat)
      .sort((a, b) => b.total - a.total);
    const topSpend = catRows[0]?.total || 1;

    // budget limits for this month/year
    const budgets = settings.categoryBudgets || [];
    const relevantBudgets = budgets.filter(b => {
      if (b.period === 'month') return true;
      if (b.period === 'year') return true;
      return false;
    });

    // budget spent amounts for this period
    function budgetSpentForReport(budget) {
      if (budget.period === 'month') {
        return monthTx
          .filter(t => t.type === 'expense' && t.category === budget.category)
          .reduce((s, t) => s + t.amount, 0);
      }
      if (budget.period === 'year') {
        return allTx
          .filter(t => {
            if (t.type !== 'expense' || t.category !== budget.category) return false;
            const d = parseISO(t.date);
            return d.getFullYear() === year;
          })
          .reduce((s, t) => s + t.amount, 0);
      }
      return 0;
    }

    const prev = () => {
      if (month === 0) { setMonth(11); setYear(y => y - 1); }
      else setMonth(m => m - 1);
    };
    const next = () => {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth())) return;
      setMonth(nextM);
      if (month === 11) setYear(y => y + 1);
    };
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    return e('div', { className: 'scrim', onMouseDown: ev => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet', style: { maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 0 } },

        // header
        e('div', { className: 'sheet-head' },
          e('h3', null, 'Monthly Report'),
          e('button', { className: 'x-btn', onClick: onClose }, e(Icon, { name: 'close', size: 17 }))
        ),

        // month nav
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 } },
          e('button', { className: 'x-btn', onClick: prev }, e(Icon, { name: 'chevL', size: 18 })),
          e('span', { style: { fontSize: 16, fontWeight: 660, letterSpacing: '-0.02em' } }, label),
          e('button', {
            className: 'x-btn',
            onClick: next,
            style: { opacity: isCurrentMonth ? 0.3 : 1, pointerEvents: isCurrentMonth ? 'none' : 'auto' },
          }, e(Icon, { name: 'chevR', size: 18 }))
        ),

        // scrollable body
        e('div', { style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 } },

          // summary row
          e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
            e('div', { style: { background: 'var(--card-2)', borderRadius: 12, padding: '12px 14px' } },
              e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 620, letterSpacing: '0.04em', marginBottom: 4 } }, 'EARNED'),
              e('div', { style: { fontSize: 17, fontWeight: 700, color: 'var(--good)', letterSpacing: '-0.02em' } }, fmt(income))
            ),
            e('div', { style: { background: 'var(--card-2)', borderRadius: 12, padding: '12px 14px' } },
              e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 620, letterSpacing: '0.04em', marginBottom: 4 } }, 'SPENT'),
              e('div', { style: { fontSize: 17, fontWeight: 700, color: 'var(--bad)', letterSpacing: '-0.02em' } }, fmt(spent))
            ),
            e('div', { style: { background: 'var(--card-2)', borderRadius: 12, padding: '12px 14px' } },
              e('div', { style: { fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 620, letterSpacing: '0.04em', marginBottom: 4 } }, 'NET'),
              e('div', { style: { fontSize: 17, fontWeight: 700, color: net >= 0 ? 'var(--good)' : 'var(--bad)', letterSpacing: '-0.02em' } },
                (net >= 0 ? '+' : '') + fmt(net)
              )
            )
          ),

          // spending limits progress (if any)
          relevantBudgets.length > 0 && e('div', null,
            e('div', { style: { fontSize: 12, fontWeight: 660, color: 'var(--ink-3)', letterSpacing: '0.06em', marginBottom: 10 } }, 'SPENDING LIMITS'),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              relevantBudgets.map(b => {
                const bSpent = budgetSpentForReport(b);
                const pct    = Math.min(bSpent / b.amount, 1);
                const over   = bSpent > b.amount;
                const warn   = pct >= 0.85;
                const cat    = CATEGORIES.find(c => c.id === b.category);
                const barColor = over ? 'var(--bad)' : warn ? '#FF9F0A' : 'var(--good)';
                const periodLabel = b.period === 'month' ? 'this month' : `${year} so far`;
                return e('div', { key: b.id },
                  e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 } },
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                      e('div', { style: { width: 9, height: 9, borderRadius: '50%', background: cat?.color || 'var(--ink-3)' } }),
                      e('span', { style: { fontSize: 14, fontWeight: 580 } }, cat?.label || b.category),
                      e('span', { style: { fontSize: 12, color: 'var(--ink-3)' } }, periodLabel)
                    ),
                    e('span', { style: { fontSize: 13.5, fontWeight: 660, color: over ? 'var(--bad)' : 'var(--ink-1)' } },
                      `${fmt(bSpent)} / ${fmt(b.amount)}`
                    )
                  ),
                  e('div', { style: { height: 7, borderRadius: 99, background: 'var(--hairline-strong)', overflow: 'hidden' } },
                    e('div', { style: { height: '100%', width: `${pct * 100}%`, borderRadius: 99, background: barColor, transition: 'width .4s' } })
                  ),
                  over && e('div', { style: { fontSize: 12, color: 'var(--bad)', marginTop: 4, fontWeight: 580 } },
                    `Over by ${fmt(bSpent - b.amount)}`
                  ),
                  !over && warn && e('div', { style: { fontSize: 12, color: '#FF9F0A', marginTop: 4, fontWeight: 580 } },
                    `${fmt(b.amount - bSpent)} remaining`
                  ),
                  !over && !warn && e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 4 } },
                    `${fmt(b.amount - bSpent)} remaining`
                  )
                );
              })
            )
          ),

          // category breakdown
          catRows.length > 0 && e('div', null,
            e('div', { style: { fontSize: 12, fontWeight: 660, color: 'var(--ink-3)', letterSpacing: '0.06em', marginBottom: 10 } }, 'WHERE IT WENT'),
            e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              catRows.map(({ id, total, cat }) =>
                e('div', { key: id },
                  e('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 5 } },
                    e('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                      e('div', { style: { width: 9, height: 9, borderRadius: '50%', background: cat.color } }),
                      e('span', { style: { fontSize: 14, fontWeight: 540 } }, cat.label)
                    ),
                    e('span', { style: { fontSize: 14, fontWeight: 640 } }, fmt(total))
                  ),
                  e('div', { style: { height: 5, borderRadius: 99, background: 'var(--hairline-strong)', overflow: 'hidden' } },
                    e('div', { style: { height: '100%', width: `${(total / topSpend) * 100}%`, borderRadius: 99, background: cat.color, transition: 'width .4s' } })
                  )
                )
              )
            )
          ),

          catRows.length === 0 && e('div', { style: { textAlign: 'center', color: 'var(--ink-3)', padding: '32px 0', fontSize: 14 } },
            'No transactions recorded for this month.'
          )
        )
      )
    );
  }

  window.ReportSheet = ReportSheet;
})();
