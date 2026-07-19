/* icons.js — SF-symbol-style stroke icons. 24 grid, stroke-based. */
'use strict';

(function () {
  const e = React.createElement;

  const ICONS = {
    home: () => e('g', null,
      e('path', { d: 'M3.5 11.2 12 4l8.5 7.2' }),
      e('path', { d: 'M5.5 9.7V19a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V9.7' })
    ),
    list: () => e('g', null,
      e('path', { d: 'M8 6h12M8 12h12M8 18h12' }),
      e('circle', { cx: 4, cy: 6, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      e('circle', { cx: 4, cy: 12, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      e('circle', { cx: 4, cy: 18, r: 1.1, fill: 'currentColor', stroke: 'none' })
    ),
    savings: () => e('g', null,
      e('path', { d: 'M3.5 12.5c0-3.6 3.5-6 8-6 1 0 2 .12 2.9.35.5-1.1 1.6-1.9 2.9-1.9-.3.9-.3 1.8 0 2.6 1 .9 1.7 2 1.9 3.2H21a.8.8 0 0 1 0 1.6h-.9c-.3 1-.9 1.9-1.7 2.6V19a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.6c-.7.15-1.5.23-2.4.23s-1.7-.08-2.4-.23V19a1 1 0 0 1-1 1H6.1a1 1 0 0 1-1-1v-2.2c-1-1-1.6-2.3-1.6-3.8Z' }),
      e('circle', { cx: 8, cy: 11, r: 0.9, fill: 'currentColor', stroke: 'none' })
    ),
    chart: () => e('path', { d: 'M4 20V10M10 20V4M16 20v-7M22 20H2' }),
    plus: () => e('path', { d: 'M12 5v14M5 12h14' }),
    chevL: () => e('path', { d: 'M14.5 6 9 12l5.5 6' }),
    chevR: () => e('path', { d: 'M9.5 6 15 12l-5.5 6' }),
    chevDown: () => e('path', { d: 'M6 9.5 12 15l6-5.5' }),
    close: () => e('g', null,
      e('path', { d: 'M6 6l12 12M18 6 6 18' })
    ),
    trash: () => e('g', null,
      e('path', { d: 'M5 7h14M10 7V5h4v2M6.5 7l.8 12a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l.8-12' })
    ),
    calendar: () => e('g', null,
      e('rect', { x: 3.5, y: 5, width: 17, height: 15, rx: 2.5 }),
      e('path', { d: 'M3.5 9.5h17M8 3.5v3M16 3.5v3' })
    ),
    apple: () => e('path', { d: 'M16.3 12.3c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.5 2 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.4-1.9c.7-1.1 1-2.1 1-2.2-.1 0-2-.8-2-3.2Z', fill: 'currentColor', stroke: 'none' }),
    cash: () => e('g', null,
      e('rect', { x: 2.5, y: 6, width: 19, height: 12, rx: 2.5 }),
      e('circle', { cx: 12, cy: 12, r: 2.6 }),
      e('path', { d: 'M5.5 9.5v0M18.5 14.5v0', strokeLinecap: 'round' })
    ),
    wallet: () => e('g', null,
      e('path', { d: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H17a2 2 0 0 1 2 2v.5' }),
      e('rect', { x: 3.5, y: 7.5, width: 17, height: 11.5, rx: 2.5 }),
      e('circle', { cx: 16.5, cy: 13.3, r: 1.1, fill: 'currentColor', stroke: 'none' })
    ),
    arrowUp: () => e('path', { d: 'M12 19V6M6.5 11 12 5.5 17.5 11' }),
    arrowDown: () => e('path', { d: 'M12 5v13M6.5 13 12 18.5 17.5 13' }),
    spark: () => e('path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18' }),
    moon: () => e('path', { d: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z' }),
    sun: () => e('g', null,
      e('circle', { cx: 12, cy: 12, r: 4.5 }),
      e('path', { d: 'M12 2v2M12 20v2M2 12h2M20 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4' })
    ),
    flag: () => e('g', null,
      e('path', { d: 'M6 21V4M6 4h11l-2 3.5L17 11H6' })
    ),
    gear: () => e('g', null,
      e('path', { d: 'M4 8h9M17.5 8H20' }),
      e('circle', { cx: 15, cy: 8, r: 2.3 }),
      e('path', { d: 'M4 16h4.5M13 16h7' }),
      e('circle', { cx: 10.5, cy: 16, r: 2.3 })
    ),
    check: () => e('path', { d: 'M5 12.5 10 17.5 19 7' }),
    repeat: () => e('g', null,
      e('path', { d: 'M4 9a5 5 0 0 1 5-5h7l-2.2-2.2M20 15a5 5 0 0 1-5 5H8l2.2 2.2' })
    ),
    clothes: () => e('path', { d: 'M8.5 4 4 6.5 5.5 10l1.5-.8V20h10V9.2l1.5.8L20 6.5 15.5 4a3.5 3.5 0 0 1-7 0Z' }),
    food: () => e('g', null,
      e('path', { d: 'M6 4v5a3 3 0 0 0 6 0V4M9 9.5V20M16 4c-1.4.6-2.2 2-2.2 3.8s.8 3 2.2 3.4V20' })
    ),
    ent: () => e('g', null,
      e('rect', { x: 3.5, y: 5.5, width: 17, height: 13, rx: 2.5 }),
      e('path', { d: 'M10.5 9.5 14.5 12l-4 2.5Z', fill: 'currentColor', stroke: 'none' })
    ),
    transport: () => e('g', null,
      e('rect', { x: 5, y: 4.5, width: 14, height: 12.5, rx: 2.5 }),
      e('path', { d: 'M5 12h14M8.5 4.5V3.5M15.5 4.5V3.5' }),
      e('circle', { cx: 8.5, cy: 20, r: 1.3 }),
      e('circle', { cx: 15.5, cy: 20, r: 1.3 })
    ),
    gifts: () => e('g', null,
      e('rect', { x: 4, y: 9.5, width: 16, height: 10.5, rx: 1.5 }),
      e('path', { d: 'M3 9.5h18v3.5H3zM12 9.5V20' }),
      e('path', { d: 'M12 9.5C12 7 10.5 5 8.7 5a2.2 2.2 0 0 0 0 4.5M12 9.5c0-2.5 1.5-4.5 3.3-4.5a2.2 2.2 0 0 1 0 4.5' })
    ),
    school: () => e('g', null,
      e('path', { d: 'M2.5 9 12 5l9.5 4-9.5 4-9.5-4Z' }),
      e('path', { d: 'M6.5 11v4.5c0 1 2.5 2 5.5 2s5.5-1 5.5-2V11M21.5 9v5' })
    ),
    bell: () => e('g', null,
      e('path', { d: 'M12 3a7 7 0 0 1 7 7v4l1.5 2.5H3.5L5 14v-4a7 7 0 0 1 7-7Z' }),
      e('path', { d: 'M10 19a2 2 0 0 0 4 0' })
    ),
    pencil: () => e('g', null,
      e('path', { d: 'M4 20h4l10.5-10.5-4-4L4 16v4Z' }),
      e('path', { d: 'M14.5 5.5l4 4' })
    ),
    beauty: () => e('g', null,
      e('path', { d: 'M9 13a3 3 0 0 1 6 0v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6Z' }),
      e('path', { d: 'M10 10.5 9.5 4.5h5L14 10.5' })
    ),
  };

  function Icon({ name, size = 22, sw = 1.8, style, ...rest }) {
    const inner = ICONS[name];
    if (!inner) return null;
    return e('svg', {
      className: 'ico', width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
      style, ...rest,
    }, inner());
  }

  window.Icon = Icon;
})();
