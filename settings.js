/* settings.js — recurring allowance + savings goal + category budgets */
'use strict';

(function () {
  const { ACCOUNTS, CATEGORIES, currentYM, uid } = window.Budget;
  const Icon = window.Icon, Badge = window.Badge;
  const e = React.createElement;

  function MoneyInput({ value, onChange, style }) {
    return e('div', { className: 'date-field', style: { width: '100%', ...style } },
      e('span', { style: { color: 'var(--ink-3)', fontWeight: 700, fontSize: 16 } }, '$'),
      e('input', {
        className: 'tnum', inputMode: 'decimal', value,
        onChange: (ev) => {
          const v = ev.target.value.replace(/[^0-9.]/g, '');
          if ((v.match(/\./g) || []).length <= 1) onChange(v);
        },
        style: { flex: 1, fontSize: 16, fontWeight: 600 },
      })
    );
  }

  function SettingsSheet({ settings, onClose, onSave, onSignOut, onDeleteAccount }) {
    const [enabled, setEnabled] = React.useState(settings.allowance.enabled);
    const [amount, setAmount]   = React.useState(String(settings.allowance.amount));
    const [account, setAccount] = React.useState(settings.allowance.account);
    const [goal, setGoal]       = React.useState(String(settings.savingsGoal));

    // category budgets
    const [budgets, setBudgets] = React.useState(settings.categoryBudgets || []);
    const [addingBudget, setAddingBudget] = React.useState(false);
    const [newCat, setNewCat]   = React.useState(CATEGORIES[0].id);
    const [newAmt, setNewAmt]   = React.useState('');
    const [newPeriod, setNewPeriod] = React.useState('year');

    const save = () => {
      const amt = Math.max(0, parseFloat(amount) || 0);
      const g   = Math.max(0, parseFloat(goal)   || 0);
      onSave({
        allowance: { enabled, amount: amt, account, start: settings.allowance.start || currentYM() },
        savingsGoal: g,
        categoryBudgets: budgets,
      });
      onClose();
    };

    const addBudget = () => {
      const a = parseFloat(newAmt);
      if (!a || a <= 0) return;
      // replace existing budget for same category+period, or add
      const existing = budgets.find(b => b.category === newCat && b.period === newPeriod);
      if (existing) {
        setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, amount: a } : b));
      } else {
        const cat = CATEGORIES.find(c => c.id === newCat);
        setBudgets(prev => [...prev, {
          id: uid(),
          category: newCat,
          label: cat.label,
          amount: a,
          period: newPeriod,
        }]);
      }
      setNewAmt('');
      setAddingBudget(false);
    };

    const removeBudget = (id) => setBudgets(prev => prev.filter(b => b.id !== id));

    // Viewer-only: read-only display, no controls
    if (!onSave) {
      const viewAllowance = settings.allowance || {};
      const viewGoal = settings.savingsGoal || 0;
      const viewBudgets = settings.categoryBudgets || [];
      return e('div', { className: 'scrim', onMouseDown: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
        e('div', { className: 'sheet' },
          e('div', { className: 'sheet-head' },
            e('h3', null, 'Settings'),
            e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
          ),

          e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 } },
            e(Badge, { color: 'var(--good)', icon: 'repeat', size: 34, radius: 10 }),
            e('div', null,
              e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Recurring allowance'),
              e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 520 } }, 'Auto-added on the 1st of each month')
            )
          ),
          e('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--ink-2)', padding: '8px 0 0 46px' } },
            viewAllowance.enabled
              ? `$${(viewAllowance.amount || 0).toLocaleString()} / month into ${viewAllowance.account === 'apple' ? 'Apple Cash' : 'Cash'}`
              : 'Not enabled'
          ),

          e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--hairline)' } },
            e(Badge, { color: 'var(--accent)', icon: 'flag', size: 34, radius: 10 }),
            e('div', null,
              e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Monthly savings goal'),
              e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 520 } }, 'How much they aim to save each month')
            )
          ),
          e('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--ink-2)', padding: '8px 0 0 46px' } },
            viewGoal > 0 ? `$${viewGoal.toLocaleString()} / month` : 'No goal set'
          ),

          viewBudgets.length > 0 && e('div', { style: { marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--hairline)' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 } },
              e(Badge, { color: 'var(--c-clothes)', icon: 'clothes', size: 34, radius: 10 }),
              e('div', null,
                e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Spending limits'),
              )
            ),
            e('div', { style: { borderRadius: 12, overflow: 'hidden', border: '1px solid var(--hairline)' } },
              viewBudgets.map((b, i) => {
                const cat = CATEGORIES.find(c => c.id === b.category);
                return e('div', { key: b.id, style: {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
                } },
                  e('div', { style: { width: 9, height: 9, borderRadius: '50%', background: cat?.color || 'var(--ink-3)', flexShrink: 0 } }),
                  e('div', { style: { flex: 1 } },
                    e('div', { style: { fontSize: 14, fontWeight: 580 } }, cat?.label || b.category),
                    e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 1 } }, `per ${b.period}`)
                  ),
                  e('span', { style: { fontSize: 14.5, fontWeight: 660 } }, `$${b.amount.toLocaleString()}`)
                );
              })
            )
          ),

          e('div', { style: { borderTop: '1px solid var(--hairline)', marginTop: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 } },
            e('button', { className: 'btn btn-ghost', style: { width: '100%', color: 'var(--bad)', fontSize: 14 }, onClick: onSignOut }, 'Sign out'),
            e('button', { className: 'btn btn-ghost', style: { width: '100%', color: 'var(--ink-3)', fontSize: 13 }, onClick: onDeleteAccount }, 'Delete account…')
          )
        )
      );
    }

    return e('div', { className: 'scrim', onMouseDown: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet' },
        e('div', { className: 'sheet-head' },
          e('h3', null, 'Settings'),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
        ),

        // ── recurring allowance ──
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 11 } },
            e(Badge, { color: 'var(--good)', icon: 'repeat', size: 34, radius: 10 }),
            e('div', null,
              e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Recurring allowance'),
              e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 520 } }, 'Auto-added on the 1st of each month')
            )
          ),
          e('button', {
            role: 'switch', 'aria-checked': enabled, onClick: () => setEnabled(v => !v),
            style: {
              width: 51, height: 31, borderRadius: 99, padding: 2, flex: 'none',
              background: enabled ? 'var(--good)' : 'var(--hairline-strong)',
              transition: 'background .2s',
            },
          },
            e('span', { style: {
              display: 'block', width: 27, height: 27, borderRadius: '50%', background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.3)',
              transform: `translateX(${enabled ? 20 : 0}px)`,
              transition: 'transform .2s',
            } })
          )
        ),

        enabled && e(React.Fragment, null,
          e('div', { className: 'field-label' }, 'Amount per month'),
          e(MoneyInput, { value: amount, onChange: setAmount }),
          e('div', { className: 'field-label' }, 'Into account'),
          e('div', { className: 'chips' },
            ACCOUNTS.map(a =>
              e('button', {
                key: a.id,
                className: 'chip' + (account === a.id ? ' on' : ''),
                style: account === a.id ? { color: 'var(--accent)' } : null,
                onClick: () => setAccount(a.id),
              },
                e(Badge, { color: a.color, icon: a.icon, size: 20, radius: 6, iconSize: 13 }),
                e('span', { style: { color: 'var(--ink-2)' } }, a.label)
              )
            )
          )
        ),

        // ── savings goal ──
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--hairline)' } },
          e(Badge, { color: 'var(--accent)', icon: 'flag', size: 34, radius: 10 }),
          e('div', null,
            e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Monthly savings goal'),
            e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 520 } }, 'How much you aim to save each month')
          )
        ),
        e('div', { style: { marginTop: 12 } }, e(MoneyInput, { value: goal, onChange: setGoal })),

        // ── category budgets ──
        e('div', { style: { marginTop: 22, paddingTop: 20, borderTop: '1px solid var(--hairline)' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 } },
            e(Badge, { color: 'var(--c-clothes)', icon: 'clothes', size: 34, radius: 10 }),
            e('div', { style: { flex: 1 } },
              e('div', { style: { fontSize: 15.5, fontWeight: 640, letterSpacing: '-0.01em' } }, 'Spending limits'),
              e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 520 } }, 'Cap a category per month or year')
            ),
            !addingBudget && e('button', {
              className: 'btn btn-ghost',
              style: { padding: '6px 12px', fontSize: 13, color: 'var(--accent)', whiteSpace: 'nowrap' },
              onClick: () => setAddingBudget(true),
            }, e(Icon, { name: 'plus', size: 14 }), ' Add limit')
          ),

          // existing budgets list
          budgets.length > 0 && e('div', { style: { borderRadius: 12, overflow: 'hidden', border: '1px solid var(--hairline)', marginBottom: 12 } },
            budgets.map((b, i) => {
              const cat = CATEGORIES.find(c => c.id === b.category);
              return e('div', {
                key: b.id,
                style: {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
                }
              },
                e('div', { style: { width: 9, height: 9, borderRadius: '50%', background: cat?.color || 'var(--ink-3)', flexShrink: 0 } }),
                e('div', { style: { flex: 1 } },
                  e('div', { style: { fontSize: 14, fontWeight: 580 } }, cat?.label || b.category),
                  e('div', { style: { fontSize: 12, color: 'var(--ink-3)', marginTop: 1 } }, `per ${b.period}`)
                ),
                e('span', { style: { fontSize: 14.5, fontWeight: 660 } }, `$${b.amount.toLocaleString()}`),
                e('button', {
                  style: { marginLeft: 8, width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', flexShrink: 0 },
                  onClick: () => removeBudget(b.id),
                  title: 'Remove',
                }, e(Icon, { name: 'close', size: 13 }))
              );
            })
          ),

          // add budget form
          addingBudget && e('div', { style: { border: '1px solid var(--hairline)', borderRadius: 12, padding: '14px 14px 10px' } },
            e('div', { className: 'field-label' }, 'Category'),
            e('div', { className: 'chips', style: { flexWrap: 'wrap', marginBottom: 12 } },
              CATEGORIES.map(c =>
                e('button', {
                  key: c.id, type: 'button',
                  className: 'chip' + (newCat === c.id ? ' on' : ''),
                  style: newCat === c.id ? { color: 'var(--accent)' } : null,
                  onClick: () => setNewCat(c.id),
                }, c.label)
              )
            ),
            e('div', { className: 'field-label' }, 'Limit amount'),
            e(MoneyInput, { value: newAmt, onChange: setNewAmt, style: { marginBottom: 12 } }),
            e('div', { className: 'field-label' }, 'Resets every'),
            e('div', { className: 'chips', style: { marginBottom: 14 } },
              [['month', 'Month'], ['year', 'Year']].map(([v, l]) =>
                e('button', {
                  key: v, type: 'button',
                  className: 'chip' + (newPeriod === v ? ' on' : ''),
                  style: newPeriod === v ? { color: 'var(--accent)' } : null,
                  onClick: () => setNewPeriod(v),
                }, l)
              )
            ),
            e('div', { style: { display: 'flex', gap: 8 } },
              e('button', { className: 'btn btn-primary', style: { flex: 1, padding: '9px 0', fontSize: 13.5 }, onClick: addBudget }, 'Add limit'),
              e('button', { className: 'btn btn-ghost', style: { padding: '9px 14px', fontSize: 13.5 }, onClick: () => { setAddingBudget(false); setNewAmt(''); } }, 'Cancel'),
            )
          )
        ),

        e('button', { className: 'btn btn-primary', style: { width: '100%', marginTop: 22, padding: 14 }, onClick: save }, 'Save changes'),

        e('div', { style: { borderTop: '1px solid var(--hairline)', marginTop: 20, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 } },
          e('button', {
            className: 'btn btn-ghost',
            style: { width: '100%', color: 'var(--bad)', fontSize: 14 },
            onClick: onSignOut,
          }, 'Sign out'),
          e('button', {
            className: 'btn btn-ghost',
            style: { width: '100%', color: 'var(--ink-3)', fontSize: 13 },
            onClick: onDeleteAccount,
          }, 'Delete account…')
        )
      )
    );
  }

  window.SettingsSheet = SettingsSheet;
})();
