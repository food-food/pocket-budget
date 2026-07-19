/* ui.js — shared UI: Badge, DateFilter, rangeLabel */
'use strict';

(function () {
  const { MONTHS } = window.Budget;
  const Icon = window.Icon;
  const e = React.createElement;

  function Badge({ color, icon, size = 38, radius = 11, iconSize }) {
    return e('div', {
      style: {
        width: size, height: size, borderRadius: radius, background: color,
        display: 'grid', placeItems: 'center', color: '#fff', flex: 'none',
      }
    }, e(Icon, { name: icon, size: iconSize || Math.round(size * 0.55), sw: 1.9 }));
  }

  function DateFilter({ filter, onChange, minYear, maxDate }) {
    const setMode = (mode) => onChange({ ...filter, mode });
    const now = maxDate || new Date();

    const stepMonth = (dir) => {
      let m = filter.month + dir, y = filter.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      onChange({ ...filter, year: y, month: m });
    };
    const atMax = filter.year === now.getFullYear() && filter.month >= now.getMonth();
    const atMin = filter.year <= (minYear || now.getFullYear() - 2) && filter.month <= 0;

    return e('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
      e('div', { className: 'seg', role: 'tablist' },
        [['month','Month'],['ytd','Year to date'],['custom','Custom']].map(([k, l]) =>
          e('button', { key: k, className: filter.mode === k ? 'on' : '', onClick: () => setMode(k) }, l)
        )
      ),
      filter.mode === 'month' && e('div', { className: 'stepper' },
        e('button', { onClick: () => stepMonth(-1), disabled: atMin, 'aria-label': 'Previous month' }, e(Icon, { name: 'chevL', size: 18 })),
        e('span', { className: 'lbl tnum' }, `${MONTHS[filter.month]} ${filter.year}`),
        e('button', { onClick: () => stepMonth(1), disabled: atMax, 'aria-label': 'Next month' }, e(Icon, { name: 'chevR', size: 18 }))
      ),
      filter.mode === 'ytd' && e('div', { className: 'stepper' },
        e('button', { onClick: () => onChange({ ...filter, year: filter.year - 1 }), disabled: filter.year <= (minYear || now.getFullYear() - 2), 'aria-label': 'Previous year' }, e(Icon, { name: 'chevL', size: 18 })),
        e('span', { className: 'lbl tnum' }, String(filter.year)),
        e('button', { onClick: () => onChange({ ...filter, year: filter.year + 1 }), disabled: filter.year >= now.getFullYear(), 'aria-label': 'Next year' }, e(Icon, { name: 'chevR', size: 18 }))
      ),
      filter.mode === 'custom' && e('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        e('label', { className: 'date-field' },
          e(Icon, { name: 'calendar', size: 16, style: { color: 'var(--ink-3)' } }),
          e('input', { type: 'date', value: filter.customStart, max: filter.customEnd,
            onChange: (ev) => onChange({ ...filter, customStart: ev.target.value }) })
        ),
        e('span', { style: { color: 'var(--ink-3)', fontWeight: 600 } }, '→'),
        e('label', { className: 'date-field' },
          e(Icon, { name: 'calendar', size: 16, style: { color: 'var(--ink-3)' } }),
          e('input', { type: 'date', value: filter.customEnd, min: filter.customStart,
            onChange: (ev) => onChange({ ...filter, customEnd: ev.target.value }) })
        )
      )
    );
  }

  function rangeLabel(filter) {
    if (filter.mode === 'month') return `${MONTHS[filter.month]} ${filter.year}`;
    if (filter.mode === 'ytd') return `Jan – ${MONTHS[new Date().getMonth()].slice(0,3)} ${filter.year}`;
    return 'Custom range';
  }

  Object.assign(window, { Badge, DateFilter, rangeLabel });
})();
