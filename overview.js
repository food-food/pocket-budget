/* overview.js — dashboard view */
'use strict';

(function () {
  const { CAT, CATEGORIES, ACCOUNTS, ACCT, fmt, dayLabel, categoryBudgetSpent } = window.Budget;
  const { totals, spendByCategory, trendBuckets, savingsSeries } = window.Selectors;
  const Icon = window.Icon, Badge = window.Badge, rangeLabel = window.rangeLabel;
  const { Donut, TrendBars } = window;
  const e = React.createElement;

  function Tile({ k, v, accent, sub }) {
    return e('div', { className: 'card stat', style: { padding: '18px 20px' } },
      e('span', { className: 'k' }, k),
      e('span', { className: 'v tnum sm', style: accent ? { color: accent } : null }, v),
      sub && e('span', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 540 } }, sub)
    );
  }

  function TxRow({ tx }) {
    const isExp = tx.type === 'expense';
    const cat = isExp ? CAT[tx.category] : null;
    const meta = tx.type === 'savings' ? { color: 'var(--accent)', icon: 'savings', label: 'Savings' }
      : tx.type === 'income' ? { color: 'var(--good)', icon: 'arrowDown', label: 'Income' }
      : { color: cat.color, icon: cat.icon, label: cat.label };
    return e('div', { className: 'tx' },
      e(Badge, { color: meta.color, icon: meta.icon }),
      e('div', { style: { minWidth: 0 } },
        e('div', { className: 'nm' }, tx.note || meta.label),
        e('div', { className: 'sub' }, dayLabel(tx.date), ' ', e('span', { className: 'acct-chip' }, ACCT[tx.account].label))
      ),
      e('span', { className: 'amt tnum' + (tx.type === 'income' ? ' in' : '') },
        (tx.type === 'income' ? '+' : '−') + fmt(tx.amount)
      )
    );
  }

  function BudgetLimitsCard({ allTx, settings, onOpenReport }) {
    const budgets = settings.categoryBudgets || [];
    if (budgets.length === 0) return null;

    return e('div', { className: 'card' },
      e('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 } },
        e('p', { className: 'card-title', style: { margin: 0 } }, 'Spending limits'),
        e('button', {
          className: 'btn btn-ghost',
          style: { padding: '4px 8px', fontSize: 13.5, color: 'var(--accent)' },
          onClick: onOpenReport,
        }, 'Monthly report')
      ),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        budgets.map(b => {
          const spent = categoryBudgetSpent(b, allTx);
          const pct   = Math.min(spent / b.amount, 1);
          const over  = spent > b.amount;
          const warn  = pct >= 0.85 && !over;
          const cat   = CATEGORIES.find(c => c.id === b.category);
          const barColor = over ? 'var(--bad)' : warn ? '#FF9F0A' : 'var(--good)';
          const remaining = b.amount - spent;

          return e('div', { key: b.id },
            e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 } },
              e('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                e('div', { style: { width: 10, height: 10, borderRadius: '50%', background: cat?.color || 'var(--ink-3)' } }),
                e('span', { style: { fontSize: 14.5, fontWeight: 580 } }, cat?.label || b.category),
                e('span', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 } }, `per ${b.period}`)
              ),
              e('span', { style: { fontSize: 13, fontWeight: 640, color: over ? 'var(--bad)' : 'var(--ink-2)' } },
                `${fmt(spent)} of ${fmt(b.amount)}`
              )
            ),
            e('div', { style: { height: 8, borderRadius: 99, background: 'var(--hairline-strong)', overflow: 'hidden', marginBottom: 5 } },
              e('div', { style: { height: '100%', width: `${pct * 100}%`, borderRadius: 99, background: barColor, transition: 'width .5s' } })
            ),
            over
              ? e('div', { style: { fontSize: 12.5, color: 'var(--bad)', fontWeight: 600 } }, `Over budget by ${fmt(-remaining)}`)
              : e('div', { style: { fontSize: 12.5, color: warn ? '#FF9F0A' : 'var(--ink-3)', fontWeight: warn ? 600 : 500 } },
                  warn ? `Only ${fmt(remaining)} left!` : `${fmt(remaining)} remaining`
                )
          );
        })
      )
    );
  }

  function Overview({ allTx, filtered, filter, range, balances, settings, onAdd, onGoto, onOpenReport, accent }) {
    const t = totals(filtered);
    const cats = spendByCategory(filtered);
    const buckets = trendBuckets(filtered, filter, range);
    const sav = savingsSeries(allTx);
    const available = balances.apple + balances.cash;
    const recent = filtered.slice(0, 5);

    if (allTx.length === 0) {
      return e('div', { className: 'card', style: { padding: '56px 28px' } },
        e('div', { className: 'empty' },
          e('div', { className: 'ring' }, e(Icon, { name: 'wallet', size: 26 })),
          onAdd
            ? e(React.Fragment, null,
                e('h4', null, "Let's set up your money"),
                e('p', null, 'Add your first expense, allowance, or savings deposit. Everything here updates the moment you do.'),
                e('button', { className: 'btn btn-primary', onClick: () => onAdd('expense') },
                  e(Icon, { name: 'plus', size: 18 }), ' Add a transaction'
                )
              )
            : e(React.Fragment, null,
                e('h4', null, 'Nothing here yet'),
                e('p', null, 'The owner hasn\'t added any transactions yet. Check back soon.')
              )
        )
      );
    }

    return e('div', { className: 'grid' },
      // summary tiles
      e('div', { className: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' } },
        e(Tile, { k: 'Available now', v: fmt(available), sub: 'Apple Cash + Cash' }),
        e(Tile, { k: `Spent · ${rangeLabel(filter)}`, v: fmt(t.spent), accent: 'var(--bad)' }),
        e(Tile, { k: `Earned · ${rangeLabel(filter)}`, v: fmt(t.income), accent: 'var(--good)' }),
        e(Tile, { k: 'Total saved', v: fmt(sav.total), accent: 'var(--accent)', sub: 'all-time' })
      ),

      // charts row
      e('div', { className: 'grid', style: { gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)', alignItems: 'stretch' } },
        e('div', { className: 'card' },
          e('p', { className: 'card-title' }, 'Where it went'),
          cats.length === 0
            ? e('div', { className: 'empty', style: { padding: '30px 8px' } },
                e('div', { className: 'ring' }, e(Icon, { name: 'chart', size: 24 })),
                e('h4', null, 'No spending yet'),
                e('p', { style: { marginBottom: 0 } }, `Nothing recorded for ${rangeLabel(filter)}.`)
              )
            : e('div', { style: { display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' } },
                e(Donut, { data: cats, total: t.spent }),
                e('div', { style: { flex: 1, minWidth: 168 } },
                  cats.slice(0, 6).map(c =>
                    e('button', { key: c.id, className: 'cat-row', style: { width: '100%', textAlign: 'left' }, onClick: () => onGoto('transactions', c.id) },
                      e('span', { style: { width: 11, height: 11, borderRadius: 4, background: c.color, flex: 'none' } }),
                      e('span', { className: 'nm', style: { fontSize: 14 } }, c.label),
                      e('span', { className: 'amt tnum', style: { fontSize: 14.5 } }, fmt(c.value))
                    )
                  )
                )
              )
        ),
        e('div', { className: 'card', style: { display: 'flex', flexDirection: 'column' } },
          e('p', { className: 'card-title' }, 'Spending trend'),
          e('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' } },
            e(TrendBars, { buckets, accent })
          )
        )
      ),

      // budget limits
      e(BudgetLimitsCard, { allTx, settings, onOpenReport }),

      // recent + accounts
      e('div', { className: 'grid', style: { gridTemplateColumns: 'minmax(0,7fr) minmax(0,5fr)' } },
        e('div', { className: 'card' },
          e('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 } },
            e('p', { className: 'card-title', style: { margin: 0 } }, 'Recent activity'),
            e('button', { className: 'btn btn-ghost', style: { padding: '4px 8px', fontSize: 13.5, color: 'var(--accent)' }, onClick: () => onGoto('transactions') }, 'See all')
          ),
          recent.length === 0
            ? e('p', { style: { color: 'var(--ink-3)', fontSize: 14, padding: '14px 0 4px' } }, `Nothing in ${rangeLabel(filter)} yet.`)
            : recent.map(tx => e(TxRow, { key: tx.id, tx }))
        ),
        e('div', { className: 'card' },
          e('p', { className: 'card-title' }, 'Accounts'),
          ACCOUNTS.map(a =>
            e('div', { key: a.id, className: 'cat-row' },
              e(Badge, { color: a.color, icon: a.icon }),
              e('div', null,
                e('div', { className: 'nm' }, a.label),
                e('div', { className: 'meta' }, a.id === 'apple' ? 'Digital' : 'Wallet')
              ),
              e('span', { className: 'amt tnum' }, fmt(balances[a.id]))
            )
          ),
          e('div', { className: 'cat-row', style: { borderTop: '1px solid var(--hairline-strong)' } },
            e('div', { style: { width: 38 } }),
            e('div', { className: 'nm', style: { color: 'var(--ink-3)' } }, 'Total available'),
            e('span', { className: 'amt tnum', style: { fontSize: 17 } }, fmt(available))
          )
        )
      )
    );
  }

  Object.assign(window, { Overview, TxRow });
})();
