/* savings.js — savings total, monthly goal tracker, deposits */
'use strict';

(function () {
  const { fmt, ACCT, dayLabel, currentYM, ymOf, MON_ABBR } = window.Budget;
  const { savingsSeries, totals } = window.Selectors;
  const Icon = window.Icon, Badge = window.Badge, rangeLabel = window.rangeLabel;
  const { SavingsArea } = window;
  const e = React.createElement;

  function GoalRing({ pct, accent = 'var(--accent)', size = 132, stroke = 13 }) {
    const r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
    const done = pct >= 1;
    return e('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { flex: 'none' } },
      e('circle', { cx: c, cy: c, r, fill: 'none', stroke: 'var(--card-2)', strokeWidth: stroke }),
      e('circle', { cx: c, cy: c, r, fill: 'none', stroke: done ? 'var(--good)' : accent, strokeWidth: stroke,
        strokeLinecap: 'round', strokeDasharray: `${circ * Math.min(1, pct)} ${circ}`,
        transform: `rotate(-90 ${c} ${c})`,
        style: { transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' } }),
      e('text', { x: c, y: c + (done ? 6 : 2), textAnchor: 'middle', fontSize: done ? 30 : 23, fontWeight: 760,
        fill: done ? 'var(--good)' : 'var(--ink)', className: 'tnum', style: { letterSpacing: '-0.03em' } },
        done ? '✓' : Math.round(pct * 100) + '%'
      ),
      !done && e('text', { x: c, y: c + 20, textAnchor: 'middle', fontSize: 11, fontWeight: 600, fill: 'var(--ink-3)' }, 'of goal')
    );
  }

  function savingsByMonth(allTx) {
    const map = {};
    allTx.forEach(t => { if (t.type === 'savings') { const k = ymOf(t.date); map[k] = (map[k] || 0) + t.amount; } });
    return map;
  }

  function Savings({ allTx, filtered, filter, settings, onAdd, onOpenSettings }) {
    const sav = savingsSeries(allTx);
    const deposits = allTx.filter(t => t.type === 'savings').sort((a, b) => b.date.localeCompare(a.date));
    const goal = settings.savingsGoal || 0;
    const byMonth = savingsByMonth(allTx);
    const thisYM = currentYM();
    const savedThisMonth = byMonth[thisYM] || 0;
    const pct = goal > 0 ? savedThisMonth / goal : (savedThisMonth > 0 ? 1 : 0);
    const remaining = Math.max(0, goal - savedThisMonth);

    const history = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const val = byMonth[k] || 0;
      history.push({ label: MON_ABBR[dt.getMonth()], val, met: goal > 0 && val >= goal, current: k === thisYM });
    }

    if (deposits.length === 0 && goal === 0) {
      return e('div', { className: 'card', style: { padding: '52px 28px' } },
        e('div', { className: 'empty' },
          e('div', { className: 'ring', style: { color: 'var(--accent)' } }, e(Icon, { name: 'savings', size: 28 })),
          onAdd
            ? e(React.Fragment, null,
                e('h4', null, 'Start your savings'),
                e('p', null, 'Every dollar you set aside is tracked here and watches your total climb over time.'),
                e('button', { className: 'btn btn-primary', onClick: () => onAdd('savings') },
                  e(Icon, { name: 'plus', size: 18 }), ' Add to savings'
                )
              )
            : e(React.Fragment, null,
                e('h4', null, 'No savings yet'),
                e('p', null, "The owner hasn't added any savings deposits yet.")
              )
        )
      );
    }

    return e('div', { className: 'grid' },
      // hero card
      e('div', { className: 'card', style: { background: 'linear-gradient(160deg, color-mix(in oklab, var(--accent) 12%, var(--card)), var(--card) 60%)', overflow: 'hidden' } },
        e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' } },
          e('div', { className: 'stat' },
            e('span', { className: 'k' }, 'Total saved'),
            e('span', { className: 'v tnum', style: { fontSize: 46, color: 'var(--accent)' } }, fmt(sav.total)),
            e('span', { style: { fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 540 } },
              `${fmt(totals(filtered).saved)} added in ${rangeLabel(filter)}`
            )
          ),
          onAdd && e('button', { className: 'btn btn-primary', onClick: () => onAdd('savings') },
            e(Icon, { name: 'plus', size: 18 }), ' Add'
          )
        ),
        sav.points.length > 0 && e('div', { style: { marginTop: 18, marginInline: -4 } },
          e(SavingsArea, { points: sav.points })
        )
      ),

      // monthly goal
      e('div', { className: 'card' },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
          e('p', { className: 'card-title', style: { margin: 0 } }, 'Monthly goal'),
          onOpenSettings && e('button', { className: 'btn btn-ghost', style: { padding: '4px 8px', fontSize: 13, color: 'var(--accent)' }, onClick: onOpenSettings },
            e(Icon, { name: 'gear', size: 15 }), ' Edit'
          )
        ),
        goal === 0
          ? e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0' } },
              e('span', { style: { color: 'var(--ink-3)', fontSize: 14, fontWeight: 520 } }, 'No monthly goal set yet.'),
              onOpenSettings && e('button', { className: 'btn', onClick: onOpenSettings }, 'Set a goal')
            )
          : e('div', { style: { display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' } },
              e(GoalRing, { pct }),
              e('div', { style: { flex: 1, minWidth: 180 } },
                e('div', { style: { fontSize: 13, fontWeight: 580, color: 'var(--ink-3)' } }, 'This month'),
                e('div', { className: 'tnum', style: { fontSize: 26, fontWeight: 740, letterSpacing: '-0.03em', margin: '2px 0 8px' } },
                  fmt(savedThisMonth), ' ',
                  e('span', { style: { fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 } }, `/ ${fmt(goal, { cents: false })}`)
                ),
                e('div', { style: { fontSize: 14, fontWeight: 560, color: pct >= 1 ? 'var(--good)' : 'var(--ink-2)' } },
                  pct >= 1 ? 'Goal reached — nice work!' : `${fmt(remaining)} to go this month`
                ),
                // 6-month history strip
                e('div', { style: { display: 'flex', gap: 6, marginTop: 16 } },
                  history.map((h, i) =>
                    e('div', { key: i, style: { flex: 1, textAlign: 'center' } },
                      e('div', {
                        title: fmt(h.val),
                        style: {
                          height: 34, borderRadius: 8, display: 'grid', placeItems: 'center',
                          background: h.met ? 'var(--good)' : h.val > 0 ? 'color-mix(in oklab, var(--accent) 22%, var(--card-2))' : 'var(--card-2)',
                          color: h.met ? '#fff' : 'var(--ink-3)',
                          outline: h.current ? '2px solid var(--accent)' : 'none',
                          outlineOffset: 2,
                        }
                      },
                        h.met
                          ? e(Icon, { name: 'check', size: 16, sw: 2.4 })
                          : e('span', { style: { fontSize: 11, fontWeight: 700 }, className: 'tnum' },
                              h.val > 0 ? Math.round((h.val / goal) * 100) + '%' : '–'
                            )
                      ),
                      e('div', { style: { fontSize: 10.5, fontWeight: 600, color: h.current ? 'var(--accent)' : 'var(--ink-3)', marginTop: 5 } }, h.label)
                    )
                  )
                )
              )
            )
      ),

      // deposits list
      deposits.length > 0 && e('div', { className: 'card' },
        e('p', { className: 'card-title' }, 'Deposits'),
        deposits.map(tx =>
          e('div', { className: 'tx', key: tx.id },
            e(Badge, { color: tx.auto ? 'var(--ink-3)' : 'var(--accent)', icon: 'savings' }),
            e('div', { style: { minWidth: 0 } },
              e('div', { className: 'nm' },
                tx.auto
                  ? e('span', null, 'Auto-saved ', e('span', { style: { fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--card-2)', color: 'var(--ink-3)', marginLeft: 4 } }, 'auto'))
                  : (tx.note || 'Savings deposit')
              ),
              e('div', { className: 'sub' }, dayLabel(tx.date), tx.auto ? ' · based on monthly balance change' : (' ' + e('span', { className: 'acct-chip' }, `from ${ACCT[tx.account].label}`)))
            ),
            e('span', { className: 'amt tnum', style: { color: tx.auto ? 'var(--ink-2)' : 'var(--accent)' } }, '+' + fmt(tx.amount))
          )
        )
      )
    );
  }

  window.Savings = Savings;
})();
