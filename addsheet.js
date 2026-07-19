/* addsheet.js — add / edit transaction modal/sheet */
'use strict';

(function () {
  const { CATEGORIES, ACCOUNTS, isoDate, uid } = window.Budget;
  const Icon = window.Icon, Badge = window.Badge;
  const e = React.createElement;

  // existing: Transaction | null  — when set, sheet is in edit mode
  function AddSheet({ onClose, onAdd, onEdit, defaultType = 'expense', existing = null }) {
    const [type, setType] = React.useState(existing ? existing.type : defaultType);
    const [amount, setAmount] = React.useState(existing ? String(existing.amount) : '');
    const [category, setCategory] = React.useState(existing?.category || 'food');
    const [account, setAccount] = React.useState(existing?.account || 'apple');
    const [note, setNote] = React.useState(existing?.note || '');
    const [date, setDate] = React.useState(existing?.date || isoDate(new Date()));
    const inputRef = React.useRef(null);
    const isEdit = Boolean(existing);

    React.useEffect(() => {
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 120);
      return () => clearTimeout(t);
    }, []);

    const num = parseFloat(amount);
    const valid = num > 0;

    const submit = () => {
      if (!valid) return;
      const tx = {
        id: isEdit ? existing.id : uid(),
        type, amount: +num.toFixed(2), account,
        note: note.trim(), date,
        ...(existing?.auto ? { auto: true } : {}),
      };
      if (type === 'expense') tx.category = category;
      if (isEdit) onEdit(tx); else onAdd(tx);
      onClose();
    };

    const onKey = (ev) => { if (ev.key === 'Enter' && valid) submit(); };

    const typeMeta = {
      expense: { glyph: '−', glyphColor: 'var(--bad)',    save: isEdit ? 'Save changes' : 'Add expense' },
      income:  { glyph: '+', glyphColor: 'var(--good)',   save: isEdit ? 'Save changes' : 'Add income' },
      savings: { glyph: '→', glyphColor: 'var(--accent)', save: isEdit ? 'Save changes' : 'Add to savings' },
    }[type];

    const title = isEdit ? 'Edit transaction'
      : type === 'savings' ? 'New savings'
      : type === 'income'  ? 'New income'
      : 'New expense';

    return e('div', { className: 'scrim', onMouseDown: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
      e('div', { className: 'sheet', onKeyDown: onKey },
        e('div', { className: 'sheet-head' },
          e('h3', null, title),
          e('button', { className: 'x-btn', onClick: onClose, 'aria-label': 'Close' }, e(Icon, { name: 'close', size: 17 }))
        ),

        // type switch — disabled for auto recurring rows
        e('div', { className: 'seg-2' },
          [['expense','Expense'],['income','Income'],['savings','Savings']].map(([k, l]) =>
            e('button', {
              key: k,
              className: type === k ? 'on' : '',
              onClick: () => !existing?.auto && setType(k),
              style: existing?.auto ? { opacity: 0.5, cursor: 'default' } : null,
            }, l)
          )
        ),

        // amount
        e('div', { className: 'amount-entry' },
          e('span', { className: 'glyph', style: { color: typeMeta.glyphColor } }, typeMeta.glyph),
          e('span', { className: 'glyph' }, '$'),
          e('input', {
            ref: inputRef, className: 'tnum', inputMode: 'decimal', placeholder: '0', value: amount,
            onChange: (ev) => {
              const v = ev.target.value.replace(/[^0-9.]/g, '');
              if ((v.match(/\./g) || []).length <= 1) setAmount(v);
            },
          })
        ),

        // category (expense only)
        type === 'expense' && e(React.Fragment, null,
          e('div', { className: 'field-label' }, 'Category'),
          e('div', { className: 'chips' },
            CATEGORIES.map(c =>
              e('button', {
                key: c.id,
                className: 'chip' + (category === c.id ? ' on' : ''),
                style: category === c.id ? { color: c.color } : null,
                onClick: () => setCategory(c.id),
              },
                e('span', { className: 'dot', style: { background: c.color } }),
                e('span', { style: { color: 'var(--ink-2)' } }, c.label)
              )
            )
          )
        ),

        // account
        e('div', { className: 'field-label' }, type === 'income' ? 'Into account' : 'From account'),
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
        ),

        // note + date
        e('div', { className: 'field-label' }, 'Details'),
        e('input', {
          className: 'text-input',
          placeholder: type === 'income' ? 'e.g. Allowance, babysitting' : type === 'savings' ? 'e.g. Monthly save' : 'What was it? (optional)',
          value: note,
          onChange: (ev) => setNote(ev.target.value),
        }),
        e('label', { className: 'date-field', style: { marginTop: 10, width: '100%' } },
          e(Icon, { name: 'calendar', size: 16, style: { color: 'var(--ink-3)' } }),
          e('input', { type: 'date', value: date, max: isoDate(new Date()), onChange: (ev) => setDate(ev.target.value), style: { flex: 1 } })
        ),

        e('button', { className: 'btn btn-primary', style: { width: '100%', marginTop: 20, padding: '14px' }, disabled: !valid, onClick: submit },
          typeMeta.save
        )
      )
    );
  }

  window.AddSheet = AddSheet;
})();
