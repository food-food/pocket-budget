/* budgets.js — budgets page: create, view, and track spending against budgets */
'use strict';

(function () {
  const { CATEGORIES, CAT, fmt, uid, currentYM, ymOf, isoDate, categoryBudgetSpent } = window.Budget;
  const Icon = window.Icon, Badge = window.Badge;
  const e = React.createElement;

  // ---- progress bar ----
  function ProgressBar({ pct, color, over }) {
    return e('div', { style: { height: 7, borderRadius: 99, background: 'var(--card-2)', overflow: 'hidden' } },
      e('div', {
        style: {
          height: '100%', borderRadius: 99,
          width: Math.min(100, Math.round(pct * 100)) + '%',
          background: over ? 'var(--bad)' : color,
          transition: 'width .5s cubic-bezier(.2,.8,.2,1)',
        }
      })
    );
  }

  // ---- add/edit budget sheet ----
  function BudgetSheet({ existing, onSave, onClose, onDelete }) {
    const [name,    setName]    = React.useState(existing?.name    || '');
    const [desc,    setDesc]    = React.useState(existing?.description || '');
    const [cat,     setCat]     = React.useState(existing?.category || CATEGORIES[0].id);
    const [amount,  setAmount]  = React.useState(existing ? String(existing.amount) : '');
    const [period,  setPeriod]  = React.useState(existing?.period  || 'month');
    const [error,   setError]   = React.useState('');

    const submit = (ev) => {
      ev.preventDefault();
      const amt = parseFloat(amount);
      if (!name.trim())   { setError('Give your budget a name.'); return; }
      if (!amt || amt <= 0) { setError('Enter a budget amount.'); return; }
      onSave({
        id:          existing?.id || uid(),
        name:        name.trim(),
        description: desc.trim(),
        category:    cat,
        label:       CAT[cat]?.label || cat,
        amount:      amt,
        period,
      });
      onClose();
    };

    return e('div', { className: 'scrim', onMouseDown: ev => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet' },
        e('div', { className: 'sheet-head' },
          e('h3', null, existing ? 'Edit budget' : 'New budget'),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
        ),

        e('form', { onSubmit: submit },
          e('div', { className: 'field-label' }, 'Name'),
          e('input', {
            className: 'text-input', type: 'text', placeholder: 'e.g. Summer Wardrobe',
            value: name, onChange: ev => setName(ev.target.value),
            style: { marginBottom: 12 },
            autoFocus: true,
          }),

          e('div', { className: 'field-label' }, 'Description ', e('span', { style: { fontWeight: 400, color: 'var(--ink-3)' } }, '(optional)')),
          e('textarea', {
            className: 'text-input',
            placeholder: 'What is this budget for?',
            value: desc, onChange: ev => setDesc(ev.target.value),
            rows: 2,
            style: { marginBottom: 14, resize: 'none' },
          }),

          e('div', { className: 'field-label' }, 'Category'),
          e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 } },
            CATEGORIES.map(c =>
              e('button', {
                key: c.id, type: 'button',
                className: 'chip' + (cat === c.id ? ' on' : ''),
                style: cat === c.id ? { color: c.color, borderColor: c.color, background: 'color-mix(in oklab,' + c.color + ' 12%, transparent)' } : null,
                onClick: () => setCat(c.id),
              },
                e(Icon, { name: c.icon, size: 14 }), ' ', c.label
              )
            )
          ),

          e('div', { className: 'field-label' }, 'Budget amount'),
          e('input', {
            className: 'text-input', type: 'number', placeholder: '0.00', min: '0', step: '0.01',
            value: amount, onChange: ev => setAmount(ev.target.value),
            style: { marginBottom: 14 },
          }),

          e('div', { className: 'field-label' }, 'Resets'),
          e('div', { className: 'chips', style: { marginBottom: 18 } },
            [['month', 'Monthly'], ['year', 'Yearly']].map(([p, label]) =>
              e('button', {
                key: p, type: 'button',
                className: 'chip' + (period === p ? ' on' : ''),
                style: period === p ? { color: 'var(--accent)' } : null,
                onClick: () => setPeriod(p),
              }, label)
            )
          ),

          error && e('div', { className: 'auth-msg auth-msg-err', style: { marginBottom: 10 } }, error),

          e('button', {
            type: 'submit', className: 'btn btn-primary',
            style: { width: '100%', padding: 13 },
          }, existing ? 'Save changes' : e(React.Fragment, null, e(Icon, { name: 'plus', size: 16 }), ' Create budget')),

          existing && e('button', {
            type: 'button', className: 'btn',
            style: { width: '100%', padding: 12, marginTop: 8, color: 'var(--bad)' },
            onClick: () => { if (confirm('Delete this budget?')) { onDelete(existing.id); onClose(); } },
          }, 'Delete budget')
        )
      )
    );
  }

  // ---- budget detail sheet ----
  function BudgetDetailSheet({ budget, allTx, onClose, onAddTx, onEditBudget, canWrite }) {
    const { dayLabel, isoDate, parseISO } = window.Budget;
    const [addingExpense, setAddingExpense] = React.useState(false);
    const cat = CAT[budget.category] || {};
    const spent = categoryBudgetSpent(budget, allTx);
    const pct = budget.amount > 0 ? spent / budget.amount : 0;
    const over = spent > budget.amount;
    const remaining = budget.amount - spent;

    // Transactions in this category within the budget period
    const now = new Date();
    const periodTx = allTx.filter(tx => {
      if (tx.type !== 'expense' || tx.category !== budget.category) return false;
      const d = parseISO(tx.date);
      if (budget.period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      return d.getFullYear() === now.getFullYear();
    }).sort((a, b) => b.date.localeCompare(a.date));

    if (addingExpense) {
      return e(window.AddSheet, {
        defaultType: 'expense',
        defaultCategory: budget.category,
        onClose: () => setAddingExpense(false),
        onAdd: (tx) => { onAddTx(tx); setAddingExpense(false); },
      });
    }

    return e('div', { className: 'scrim', onMouseDown: ev => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet' },
        e('div', { className: 'sheet-head' },
          e('h3', null, budget.name),
          e('div', { style: { display: 'flex', gap: 6 } },
            canWrite && e('button', { className: 'x-btn', onClick: onEditBudget, title: 'Edit budget', style: { color: 'var(--accent)' } }, e(Icon, { name: 'gear', size: 17 })),
            e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
          )
        ),

        budget.description && e('div', { style: { fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 14 } }, budget.description),

        // Progress section
        e('div', { style: { background: 'var(--card-2)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 } },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } },
            e('span', { className: 'tnum', style: { fontSize: 28, fontWeight: 760, letterSpacing: '-0.03em', color: over ? 'var(--bad)' : 'var(--ink)' } }, fmt(spent)),
            e('span', { style: { fontSize: 14, color: 'var(--ink-3)', fontWeight: 560 } }, '/ ' + fmt(budget.amount, { cents: false })),
          ),
          e(ProgressBar, { pct, color: cat.color || 'var(--accent)', over }),
          e('div', { style: { marginTop: 8, fontSize: 13, fontWeight: 580, color: over ? 'var(--bad)' : 'var(--ink-3)' } },
            over
              ? fmt(Math.abs(remaining)) + ' over budget'
              : fmt(remaining) + ' remaining · ' + (budget.period === 'month' ? 'resets next month' : 'resets next year')
          )
        ),

        // Add expense button
        canWrite && e('button', {
          className: 'btn btn-primary',
          style: { width: '100%', padding: 13, marginBottom: 18 },
          onClick: () => setAddingExpense(true),
        }, e(Icon, { name: 'plus', size: 16 }), ' Add expense'),

        // Recent transactions in this budget
        e('div', { className: 'field-label' }, budget.period === 'month' ? 'This month' : 'This year'),
        periodTx.length === 0
          ? e('div', { style: { color: 'var(--ink-3)', fontSize: 14, fontWeight: 520, padding: '12px 0' } }, 'No expenses yet.')
          : e('div', { style: { borderRadius: 13, overflow: 'hidden', border: '1px solid var(--hairline)' } },
              periodTx.map((tx, i) =>
                e('div', { key: tx.id, className: 'tx', style: { borderTop: i > 0 ? '1px solid var(--hairline)' : 'none', borderRadius: 0 } },
                  e(Badge, { color: cat.color || 'var(--accent)', icon: cat.icon || 'flag' }),
                  e('div', { style: { minWidth: 0 } },
                    e('div', { className: 'nm' }, tx.note || cat.label),
                    e('div', { className: 'sub' }, dayLabel(tx.date))
                  ),
                  e('span', { className: 'amt tnum', style: { color: 'var(--bad)' } }, '−' + fmt(tx.amount))
                )
              )
            )
      )
    );
  }

  // ---- single budget card ----
  function BudgetCard({ budget, allTx, onClick }) {
    const cat = CAT[budget.category] || {};
    const spent = categoryBudgetSpent(budget, allTx);
    const pct = budget.amount > 0 ? spent / budget.amount : 0;
    const over = spent > budget.amount;
    const remaining = budget.amount - spent;
    const periodLabel = budget.period === 'month' ? 'this month' : 'this year';

    return e('div', { className: 'card', style: { cursor: 'pointer' }, onClick },
      e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 } },
        e(Badge, { color: cat.color || 'var(--accent)', icon: cat.icon || 'flag', size: 38, radius: 12 }),
        e('div', { style: { flex: 1, minWidth: 0 } },
          e('div', { style: { fontSize: 15.5, fontWeight: 660, letterSpacing: '-0.01em', marginBottom: 1 } }, budget.name),
          budget.description && e('div', { style: { fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500, marginBottom: 2 } }, budget.description),
          e('div', { style: { fontSize: 12, color: 'var(--ink-3)', fontWeight: 520 } }, cat.label, ' · ', budget.period === 'month' ? 'Monthly' : 'Yearly'),
        ),
        e('div', { style: { color: 'var(--ink-3)', flexShrink: 0 } }, e(Icon, { name: 'chevR', size: 16 })),
      ),

      e(ProgressBar, { pct, color: cat.color || 'var(--accent)', over }),

      e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 } },
        e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 4 } },
          e('span', { className: 'tnum', style: { fontSize: 22, fontWeight: 740, letterSpacing: '-0.03em', color: over ? 'var(--bad)' : 'var(--ink)' } },
            fmt(spent)
          ),
          e('span', { style: { fontSize: 13.5, color: 'var(--ink-3)', fontWeight: 560 } },
            ' / ', fmt(budget.amount, { cents: false })
          ),
        ),
        e('span', { style: { fontSize: 13, fontWeight: 580, color: over ? 'var(--bad)' : 'var(--ink-3)' } },
          over
            ? fmt(Math.abs(remaining)) + ' over'
            : fmt(remaining) + ' left ' + periodLabel
        ),
      )
    );
  }

  // ---- main budgets page ----
  function Budgets({ allTx, settings, onSaveSettings, onAddTx, canWrite }) {
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [viewing, setViewing]     = React.useState(null); // budget being viewed
    const [editing, setEditing]     = React.useState(null); // budget being edited
    const budgets = settings.categoryBudgets || [];

    const saveBudget = (b) => {
      const existing = budgets.find(x => x.id === b.id);
      const next = existing
        ? budgets.map(x => x.id === b.id ? b : x)
        : [...budgets, b];
      onSaveSettings({ ...settings, categoryBudgets: next });
    };

    const deleteBudget = (id) => {
      onSaveSettings({ ...settings, categoryBudgets: budgets.filter(x => x.id !== id) });
      setViewing(null);
    };

    return e('div', null,
      budgets.length === 0
        ? e('div', { className: 'card', style: { padding: '52px 28px' } },
            e('div', { className: 'empty' },
              e('div', { className: 'ring', style: { color: 'var(--accent)' } }, e(Icon, { name: 'flag', size: 28 })),
              canWrite
                ? e(React.Fragment, null,
                    e('h4', null, 'Set your first budget'),
                    e('p', null, 'Create spending limits for categories like clothes, food, or entertainment. Your expenses automatically count toward them.'),
                    e('button', { className: 'btn btn-primary', onClick: () => setSheetOpen(true) },
                      e(Icon, { name: 'plus', size: 18 }), ' New budget'
                    )
                  )
                : e(React.Fragment, null,
                    e('h4', null, 'No budgets yet'),
                    e('p', null, "The owner hasn't set any budgets yet.")
                  )
            )
          )
        : e('div', { className: 'grid' },
            canWrite && e('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
              e('button', { className: 'btn btn-primary', onClick: () => setSheetOpen(true) },
                e(Icon, { name: 'plus', size: 16 }), ' New budget'
              )
            ),
            budgets.map(b =>
              e(BudgetCard, { key: b.id, budget: b, allTx, onClick: () => setViewing(b) })
            )
          ),

      // New budget sheet
      sheetOpen && e(BudgetSheet, {
        onSave: saveBudget,
        onClose: () => setSheetOpen(false),
      }),

      // Edit budget sheet
      editing && e(BudgetSheet, {
        existing: editing,
        onSave: (b) => { saveBudget(b); setViewing(b); },
        onDelete: deleteBudget,
        onClose: () => setEditing(null),
      }),

      // Budget detail sheet
      viewing && e(BudgetDetailSheet, {
        budget: viewing,
        allTx,
        canWrite,
        onClose: () => setViewing(null),
        onAddTx,
        onEditBudget: () => { setEditing(viewing); setViewing(null); },
      })
    );
  }

  window.Budgets = Budgets;
})();
