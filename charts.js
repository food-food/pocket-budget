/* charts.js — Donut, TrendBars, SavingsArea. Hand-drawn SVG, no deps. */
'use strict';

(function () {
  const { fmt } = window.Budget;
  const e = React.createElement;

  function Donut({ data, total, size = 188, stroke = 22 }) {
    const r = (size - stroke) / 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const segs = data.filter(d => d.value > 0);
    const gap = segs.length > 1 ? 2.2 : 0;

    const circles = segs.map((d, i) => {
      const frac = d.value / total;
      const len = circ * frac;
      const dash = Math.max(0, len - gap);
      const el = e('circle', {
        key: i, cx: c, cy: c, r, fill: 'none', stroke: d.color, strokeWidth: stroke,
        strokeLinecap: 'butt',
        strokeDasharray: `${dash} ${circ - dash}`,
        strokeDashoffset: -offset,
        transform: `rotate(-90 ${c} ${c})`,
        style: { transition: 'stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)' },
      });
      offset += len;
      return el;
    });

    return e('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { display: 'block' } },
      e('circle', { cx: c, cy: c, r, fill: 'none', stroke: 'var(--card-2)', strokeWidth: stroke }),
      ...circles,
      e('text', { x: c, y: c - 6, textAnchor: 'middle', fontSize: 11, fontWeight: 700,
        fill: 'var(--ink-3)', letterSpacing: '0.08em', style: { textTransform: 'uppercase' } }, 'Spent'),
      e('text', { x: c, y: c + 18, textAnchor: 'middle', fontSize: 25, fontWeight: 760,
        fill: 'var(--ink)', style: { letterSpacing: '-0.03em' }, className: 'tnum' }, fmt(total, { cents: false }))
    );
  }

  function TrendBars({ buckets, height = 132, accent = 'var(--accent)' }) {
    const max = Math.max(1, ...buckets.map(b => b.value));
    return e('div', { style: { display: 'flex', alignItems: 'flex-end', gap: buckets.length > 14 ? 3 : 8, height, paddingTop: 8 } },
      buckets.map((b, i) => {
        const h = b.value > 0 ? Math.max(4, (b.value / max) * (height - 26)) : 3;
        return e('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 } },
          e('div', {
            title: fmt(b.value),
            style: {
              width: '100%', maxWidth: 34, height: h, borderRadius: 7,
              background: b.value > 0 ? `linear-gradient(180deg, ${accent}, color-mix(in oklab, ${accent} 72%, #fff))` : 'var(--card-2)',
              transition: 'height .5s cubic-bezier(.2,.8,.2,1)',
            }
          }),
          e('span', { style: { fontSize: 10.5, fontWeight: 600, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' } }, b.label)
        );
      })
    );
  }

  function SavingsArea({ points, height = 150, accent = 'var(--good)' }) {
    const w = 600;
    const pad = 6;
    const max = Math.max(1, ...points.map(p => p.value));
    const n = points.length;
    const x = (i) => n <= 1 ? w / 2 : pad + (i / (n - 1)) * (w - pad * 2);
    const y = (v) => height - 10 - (v / max) * (height - 26);
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
    const area = `${line} L ${x(n - 1).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`;

    return e('svg', { width: '100%', height, viewBox: `0 0 ${w} ${height}`, preserveAspectRatio: 'none', style: { display: 'block', overflow: 'visible' } },
      e('defs', null,
        e('linearGradient', { id: 'sav-grad', x1: '0', y1: '0', x2: '0', y2: '1' },
          e('stop', { offset: '0%', stopColor: accent, stopOpacity: '0.28' }),
          e('stop', { offset: '100%', stopColor: accent, stopOpacity: '0' })
        )
      ),
      e('path', { d: area, fill: 'url(#sav-grad)' }),
      e('path', { d: line, fill: 'none', stroke: accent, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }),
      ...points.map((p, i) =>
        e('circle', { key: i, cx: x(i), cy: y(p.value), r: i === n - 1 ? 4.5 : 0, fill: accent, stroke: 'var(--bg-elevated)', strokeWidth: 2.5 })
      )
    );
  }

  Object.assign(window, { Donut, TrendBars, SavingsArea });
})();
