// Hopwatch's jellies for the website: a port of the app's characters (src/jelly/character)
// to SVG, with a small animation engine modeled on Reanimated (tweens, springs, sequences)
// and the app's personalities (character/idle.ts). Body outlines and anchors come
// pre-measured from jelly-data.js. Every `[data-jelly]` element on the page becomes a
// character; pages script them further through `window.Jelly` (see hop.js).
(() => {
  'use strict';

  const DATA = window.JellyData;
  if (!DATA) return;
  document.documentElement.classList.add('js-jelly');

  const INK = '#2B1B3D';
  const TONGUE = '#FF7A9C';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Colors: src/jelly/theme.ts and character/paint.tsx ---------- */

  const tones = {
    red: { fill: '#FF5C6C', light: '#FF9BA6', deep: '#D2324B' },
    orange: { fill: '#FF8A3D', light: '#FFB982', deep: '#DE6116' },
    amber: { fill: '#FFC53D', light: '#FFE393', deep: '#E39510' },
    lime: { fill: '#9ED93F', light: '#CDF184', deep: '#68A61B' },
    green: { fill: '#34C97E', light: '#86E7B5', deep: '#1B9A5B' },
    teal: { fill: '#22BFAE', light: '#79E2D6', deep: '#0E9184' },
    cyan: { fill: '#3CC6F0', light: '#93E4FB', deep: '#1896C6' },
    blue: { fill: '#4B8BFF', light: '#94BAFF', deep: '#2860D8' },
    indigo: { fill: '#6E6BF5', light: '#A9A7FF', deep: '#4540CD' },
    violet: { fill: '#A36AFF', light: '#CEAEFF', deep: '#773BDB' },
    pink: { fill: '#FF6FB5', light: '#FFA9D3', deep: '#DC3F8A' },
    gray: { fill: '#A597B3', light: '#D2C8DC', deep: '#76688A' },
    gold: { light: '#FFF1A6', fill: '#FFC93A', deep: '#D08A06' },
    ivory: { light: '#FFFDF7', fill: '#F6E6C4', deep: '#D2B383' },
    white: { light: '#FFFFFF', fill: '#FBF7FD', deep: '#D9CFE4' },
    leaf: { light: '#B4F29A', fill: '#52CC66', deep: '#1F9447' },
    plum: { light: '#5B4677', fill: '#3A2852', deep: '#1E1230' },
    pinkEar: { light: '#FFD0E2', fill: '#FFA6C8', deep: '#F07AA8' },
  };
  const HUES = ['red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'pink', 'gray'];
  const accentHue = {
    red: 'amber', orange: 'blue', amber: 'pink', lime: 'violet', green: 'pink', teal: 'amber',
    cyan: 'pink', blue: 'amber', indigo: 'pink', violet: 'amber', pink: 'cyan', gray: 'pink',
  };

  const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  const mix = (a, b, t) => toHex(parse(a).map((v, i) => v + (parse(b)[i] - v) * t));
  const alpha = (hex, a) => `rgba(${parse(hex).join(',')},${a})`;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const DEG = 180 / Math.PI;
  const n = (v) => Math.round(v * 100) / 100;

  /** FNV-1a, as in src/jelly/geometry.ts. */
  function hashSeed(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ---------- Shared paint: gradients defined once per page ---------- */

  const NS = 'http://www.w3.org/2000/svg';
  let sharedDefs = null;
  const defined = new Set();

  function define(id, markup) {
    if (!defined.has(id)) {
      if (!sharedDefs) {
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        sharedDefs = document.createElementNS(NS, 'defs');
        svg.append(sharedDefs);
        document.body.prepend(svg);
      }
      sharedDefs.insertAdjacentHTML('beforeend', markup);
      defined.add(id);
    }
    return `url(#${id})`;
  }

  const stops = (list) => list.map(([o, c, a = 1, cls]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"${cls ? ` class="${cls}"` : ''}/>`).join('');
  const vgrad = (id, list) => define(id, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(list)}</linearGradient>`);
  const rgrad = (id, list) => define(id, `<radialGradient id="${id}">${stops(list)}</radialGradient>`);

  /** Candy material for a part: light, fill, deep from top to bottom (paint.tsx CandyPath). */
  const candy = (name) => vgrad(`jc-${name}`, [[0, tones[name].light], [0.5, tones[name].fill], [1, tones[name].deep]]);
  const bodyPaint = (hue) => vgrad(`jb-${hue}`, [[0, tones[hue].light], [0.48, tones[hue].fill], [1, tones[hue].deep]]);
  const knot = (name) => vgrad(`jk-${name}`, [[0, tones[name].fill], [1, tones[name].deep]]);
  const lightFill = (name) => vgrad(`jl-${name}`, [[0, tones[name].light], [1, tones[name].fill]]);

  /** Registers derived tones (dog ears, knits) under a name. */
  function derived(name, make) {
    if (!tones[name]) tones[name] = make();
    return name;
  }

  /* ---------- Geometry helpers ---------- */

  const geoOf = (spec) => (typeof spec.geo === 'string' ? DATA.geos[spec.geo] : spec.geo);

  /** Body width at height y, from the exported profile (one value every 2 units). */
  function widthOf(geo, y) {
    const i = clamp(y / 2, 0, geo.widths.length - 1);
    const lo = Math.floor(i);
    const hi = Math.min(lo + 1, geo.widths.length - 1);
    return geo.widths[lo] + (geo.widths[hi] - geo.widths[lo]) * (i - lo);
  }

  const forehead = (geo, t) => geo.crown.y + (geo.face.y - 7 * geo.face.s - geo.crown.y) * t;
  const hatScale = (geo, height, sink) => Math.min(clamp(geo.crown.w / 36, 0.85, 1.12) * 1.38, (geo.crown.y + sink - 1.5) / height);
  const line = (px) => Math.max(1.9, 1.2 * px);
  const lodFor = (size) => (size < 44 ? 0 : size < 84 ? 1 : 2);

  const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
  const stroke = (d, color, width, extra = '') =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  const circle = (cx, cy, r, fill, extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra}/>`;
  const oval = (x, y, w, h, fill, extra = '') => `<ellipse cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" rx="${n(w / 2)}" ry="${n(h / 2)}" fill="${fill}"${extra}/>`;
  const rrect = (x, y, w, h, r, fill, extra = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${fill}"${extra}/>`;
  const g = (transform, inner, extra = '') => `<g${transform ? ` transform="${transform}"` : ''}${extra}>${inner}</g>`;

  /* ---------- Eyes and mouths: character/face.tsx ---------- */

  const EX = 12.5;
  const EY = -1;
  const closedArcs = (dx, y, w, depth) => `M ${-dx - w} ${y} Q ${-dx} ${y + depth} ${-dx + w} ${y} M ${dx - w} ${y} Q ${dx} ${y + depth} ${dx + w} ${y}`;
  /** A moving eye: glances by `r`, blinks around its centre. */
  const eye = (x, y, r, inner) => `<g data-k="eye" data-x="${x}" data-y="${y}" data-r="${r}">${inner}</g>`;

  function dotEyes(c, r = 3.8, dx = EX) {
    const pupil = circle(0, 0, r, INK) + (c.lod > 0 ? circle(-r * 0.34, -r * 0.36, r * 0.36, '#fff') : '');
    return (
      stroke(closedArcs(dx, EY, r * 1.08, r * 1.35), INK, line(c.px), ' data-k="shut"') +
      `<g data-k="open">${eye(-dx, EY, r * 0.5, pupil)}${eye(dx, EY, r * 0.5, pupil)}</g>`
    );
  }

  const eyes = {
    dot: (c) => dotEyes(c),
    shiny(c) {
      const dx = 13;
      const w = line(c.px);
      const fill = vgrad('j-shiny', [[0, INK], [1, '#4B3470']]);
      const ball =
        oval(-4.6, -5.6, 9.2, 11.2, fill) +
        circle(-1.5, -2.3, c.lod > 0 ? 1.9 : 1.6, '#fff') +
        (c.lod > 0 ? circle(1.7, 2.3, 0.95, 'rgba(255,255,255,0.9)') : '');
      const lashes = `M ${dx + 4.8} ${EY} l 2 -1.6 M ${-dx - 4.8} ${EY} l -2 -1.6`;
      return (
        `<g data-k="shut">${stroke(closedArcs(dx, EY, 4.8, 5.4), INK, w)}${c.lod > 0 ? stroke(lashes, INK, w * 0.8) : ''}</g>` +
        `<g data-k="open">${eye(-dx, EY - 0.6, 2, ball)}${eye(dx, EY - 0.6, 2, ball)}</g>`
      );
    },
    googly(c) {
      const r = 6.8;
      const dx = 13;
      const ring = Math.max(0.9, 0.75 * c.px);
      const lid = lightFill(c.hue);
      const shut = [-dx, dx]
        .map((x) =>
          g(
            `translate(${x} ${EY - 1})`,
            circle(0, 0, r, lid) + circle(0, 0, r, 'none', ` stroke="${INK}" stroke-width="${n(ring)}"`) + stroke(`M ${-r} 0.4 Q 0 ${r * 0.62} ${r} 0.4`, INK, line(c.px) * 0.85),
          ),
        )
        .join('');
      const pupil = `<g data-k="pupil" data-gx="3" data-gy="2.4" data-oy="1.1">${circle(0, 0, 3.4, INK)}${c.lod > 0 ? circle(-1.1, -1.2, 0.95, '#fff') : ''}</g>`;
      const open = [-dx, dx]
        .map((x) => `<g data-k="lid" data-x="${x}" data-y="${EY - 1}">${circle(0, 0, r, '#fff')}${circle(0, 0, r, 'none', ` stroke="${INK}" stroke-width="${n(ring)}"`)}${pupil}</g>`)
        .join('');
      return `<g data-k="shut">${shut}</g><g data-k="open">${open}</g>`;
    },
    sleepy(c) {
      const r = 4.2;
      const w = line(c.px);
      const lid = `M ${-r - 1.2} 0.9 Q 0 ${-r * 0.55} ${r + 1.2} 0.9`;
      const clip = c.local(`<clipPath id="${c.uid}-lid"><path d="${lid} L ${r + 2} ${r + 2} L ${-r - 2} ${r + 2} Z"/></clipPath>`);
      const ball = `<g clip-path="${clip}">${circle(0, 0.6, r, INK)}${c.lod > 0 ? circle(-1.3, 1.9, 0.95, '#fff') : ''}</g>${stroke(lid, INK, w)}`;
      return (
        stroke(`M ${-EX - 4.4} ${EY + 0.8} Q ${-EX} ${EY + 2.8} ${-EX + 4.4} ${EY + 0.8} M ${EX - 4.4} ${EY + 0.8} Q ${EX} ${EY + 2.8} ${EX + 4.4} ${EY + 0.8}`, INK, w, ' data-k="shut"') +
        `<g data-k="open">${eye(-EX, EY + 0.6, 1.6, ball)}${eye(EX, EY + 0.6, 1.6, ball)}</g>`
      );
    },
    happy(c) {
      const w = line(c.px) * 1.05;
      const arc = stroke('M -4.2 1.8 Q 0 -4.2 4.2 1.8', INK, w);
      return stroke(closedArcs(EX, EY, 4, 4.8), INK, w, ' data-k="shut"') + `<g data-k="open">${eye(-EX, EY, 1.6, arc)}${eye(EX, EY, 1.6, arc)}</g>`;
    },
    cyclops(c) {
      const r = 8.4;
      const y = -3.6;
      const ring = Math.max(0.9, 0.75 * c.px);
      const w = line(c.px);
      const iris = vgrad(`jd-${c.hue}`, [[0, tones[c.hue].deep], [1, tones[c.hue].fill]]);
      const lashes = 'M -4.6 1.9 l -1.3 2 M 0 2.7 l 0 2.2 M 4.6 1.9 l 1.3 2';
      return (
        `<g data-k="shut" transform="translate(0 ${y + 1})">${stroke(`M ${-r} -1 Q 0 ${r * 0.72} ${r} -1`, INK, w * 1.05)}${c.lod > 0 ? stroke(lashes, INK, w * 0.75) : ''}</g>` +
        `<g data-k="open"><g data-k="lid" data-x="0" data-y="${y}">${circle(0, 0, r, '#fff')}${circle(0, 0, r, 'none', ` stroke="${INK}" stroke-width="${n(ring)}"`)}` +
        `<g data-k="pupil" data-gx="3.3" data-gy="2.6" data-oy="0">${circle(0, 0, 4.6, iris)}${circle(0, 0, 2.5, INK)}${c.lod > 0 ? circle(-1.5, -1.6, 1.25, '#fff') : ''}</g></g></g>`
      );
    },
    glasses(c) {
      const dx = 13.2;
      const r = 7.6;
      const frame = Math.max(1.4, 0.95 * c.px);
      const lens = (x) => circle(x, EY, r, 'none', ` stroke="${INK}" stroke-width="${n(frame)}"`);
      return (
        dotEyes(c, 3.1, dx) +
        (c.lod > 0 ? circle(-dx, EY, r, 'rgba(255,255,255,0.2)') + circle(dx, EY, r, 'rgba(255,255,255,0.2)') : '') +
        lens(-dx) +
        lens(dx) +
        stroke(`M ${-dx + r} ${EY - 1.2} Q 0 ${EY - 3.8} ${dx - r} ${EY - 1.2}`, INK, frame) +
        (c.lod > 1 ? stroke(`M ${-dx + 2} ${EY - 4.6} l 2.4 1.6 M ${dx + 2} ${EY - 4.6} l 2.4 1.6`, 'rgba(255,255,255,0.85)', 1) : '')
      );
    },
    shades(c) {
      const dx = 11.8;
      const lensPath = 'M -6.8 -4.4 L 6.8 -4.4 Q 7.7 -4.4 7.5 -3.2 L 6.5 2.3 Q 5.7 5.5 2 5.5 L -2 5.5 Q -5.7 5.5 -6.5 2.3 L -7.5 -3.2 Q -7.7 -4.4 -6.8 -4.4 Z';
      const lens = vgrad('j-shades', [[0, '#4A3566'], [1, INK]]);
      const glass = (x) => g(`translate(${x} 0)`, path(lensPath, lens) + (c.lod > 0 ? stroke('M -4.8 1.8 L -1.4 -2.6', 'rgba(255,255,255,0.55)', 1.3) : ''));
      return (
        stroke(closedArcs(EX, EY + 0.5, 4, 4.8), INK, line(c.px), ' data-k="shut"') +
        `<g data-k="shades">${rrect(-dx + 5, -4.5, 2 * dx - 10, 2.2, 1.1, INK)}${glass(-dx)}${glass(dx)}</g>`
      );
    },
  };

  const mouthDrop = { dot: 0, shiny: 0.5, googly: 0.8, sleepy: 0, happy: 0, cyclops: 2.6, glasses: 1, shades: 0.6 };
  const GRIN = 'M -7 7.2 Q 0 8.8 7 7.2 Q 6.4 15.8 0 15.8 Q -6.4 15.8 -7 7.2 Z';
  const SMILE = 'M -5.5 7.5 Q 0 13 5.5 7.5';

  function mouthShape(style, c, px) {
    const w = line(px);
    const s = (d, width = w) => stroke(d, INK, width);
    switch (style) {
      case 'smile':
        return s(SMILE);
      case 'grin': {
        const clip = c.local(`<clipPath id="${c.uid}-grin"><path d="${GRIN}"/></clipPath>`);
        return `<g clip-path="${clip}">${path(GRIN, INK)}${c.lod > 0 ? `<rect x="-8" y="6" width="16" height="3.8" fill="#fff"/>` : ''}${oval(-4, 12, 8, 5.6, TONGUE)}</g>`;
      }
      case 'cat':
        return s('M -6 7.8 Q -3 11.8 0 8.6 Q 3 11.8 6 7.8');
      case 'o':
        return oval(-3.2, 7, 6.4, 7.4, INK) + (c.lod > 0 ? oval(-2, 10.8, 4, 2.8, TONGUE) : '');
      case 'blep':
        return (
          path('M -0.4 9.4 L 4.4 9.4 L 4.4 12.6 Q 4.4 15.4 2 15.4 Q -0.4 15.4 -0.4 12.6 Z', TONGUE) +
          (c.lod > 0 ? stroke('M 2 10.4 L 2 13', '#E0507A', 0.8) : '') +
          s('M -5 7.6 Q 0 12.2 5 7.6')
        );
      case 'fang':
        return (c.lod > 0 ? path('M 1.4 9.3 L 4.8 8.5 L 3.5 13 Z', '#fff') : '') + s(SMILE);
      case 'buck':
        return (c.lod > 0 ? rrect(-2.9, 9, 2.8, 4.2, 0.8, '#fff') + rrect(0.1, 9, 2.8, 4.2, 0.8, '#fff') : '') + s('M -5.5 7.6 Q 0 12 5.5 7.6');
      case 'flat':
        return s('M -4.6 10.2 Q 0 11 4.8 8.8');
      case 'wobbly':
        return s('M -6 9.4 Q -4.5 7.4 -3 9.4 Q -1.5 11.4 0 9.4 Q 1.5 7.4 3 9.4 Q 4.5 11.4 6 9.4', w * 0.85);
      default:
        return '';
    }
  }

  function mouth(style, c, drop) {
    return (
      `<g data-k="mouth" transform="translate(0 ${drop + 9}) scale(1.2) translate(0 -9)">${mouthShape(style, c, c.px / 1.2)}</g>` +
      `<g data-k="yawn" data-drop="${drop}">${oval(-3.5, -4.6, 7, 9.2, INK)}${oval(-2.1, 0.6, 4.2, 3.2, TONGUE)}</g>`
    );
  }

  function cheeks(c, freckles, spread) {
    if (c.lod === 0) return '';
    const pale = c.hue === 'pink' || c.hue === 'red';
    const blush = pale
      ? rgrad('j-blush-w', [[0, '#fff', 0.34], [0.55, '#fff', 0.26], [1, '#fff', 0]])
      : rgrad('j-blush-p', [[0, '#FF6092', 0.42], [0.55, '#FF6092', 0.32], [1, '#FF6092', 0]]);
    let out = [-1, 1].map((side) => oval(side * spread - 5.4, 1.6, 10.8, 6.4, blush)).join('');
    if (freckles) {
      const dot = alpha(tones[c.hue].deep, 0.75);
      for (const [x, y] of [[15.8, 6.6], [18.2, 4.6], [20.6, 6.8], [18.6, 8.6]]) {
        for (const side of [-1, 1]) out += circle(side * (x + spread - 19.5), y, 0.8, dot);
      }
    }
    return out;
  }

  /* ---------- Toppers: character/toppers.tsx ---------- */

  const BEHIND = new Set(['catEars', 'bearEars', 'bunnyEars']);

  function pair(geo, inner, spread, y, lean, scale = 1) {
    return [-1, 1].map((side) => g(`translate(${n(geo.crown.x + side * spread)} ${n(y)}) rotate(${n(side * lean)}) scale(${n(side * scale)} ${n(scale)})`, inner)).join('');
  }

  const toppers = {
    catEars(geo, c) {
      const inner =
        path('M -8 5 C -6.4 -2 -3.8 -9 -1.4 -11.4 C -0.5 -12.3 0.9 -12.2 1.7 -11.1 C 4 -8 6.4 -1.5 8 5 Z', candy(c.hue)) +
        (c.lod > 0 ? path('M -4.4 3 C -3.4 -1.6 -1.8 -6 -0.4 -7.6 C 0.2 -8.2 0.9 -8.1 1.3 -7.4 C 2.6 -5.2 4 -1.2 4.6 3 Z', candy('pinkEar')) : '');
      return pair(geo, inner, geo.ear.dx * 0.86, geo.ear.y + 4, clamp(geo.ear.lean * 0.55, 8, 26), 1.45);
    },
    bearEars(geo, c) {
      const inner = path('M 0 -7 A 7 7 0 1 1 0 7 A 7 7 0 1 1 0 -7 Z', candy(c.hue)) + (c.lod > 0 ? circle(0.4, -0.2, 3.6, mix(tones[c.hue].light, '#FFB9D2', 0.45)) : '');
      return pair(geo, inner, geo.ear.dx * 0.98, geo.ear.y + 2, 0, 1.25);
    },
    bunnyEars(geo, c) {
      const s = Math.min(1.3, (geo.crown.y + 4) / 23.4);
      const ear = (side, lean) =>
        g(
          `translate(${n(geo.crown.x + side * 7.5 * s)} ${n(geo.crown.y + 5)}) rotate(${side * lean}) scale(${n(s)})`,
          path('M -4.8 2 C -5.8 -8 -4.8 -20 0 -22.4 C 4.8 -20 5.8 -8 4.8 2 Z', candy(c.hue)) +
            (c.lod > 0 ? path('M -2.2 -1 C -2.8 -8 -2.4 -16 0 -17.8 C 2.4 -16 2.8 -8 2.2 -1 Z', candy('pinkEar')) : ''),
        );
      return ear(-1, 9) + ear(1, 17);
    },
    dogEars(geo, c) {
      const t = tones[c.hue];
      const name = derived(`dogEar-${c.hue}`, () => ({ light: t.fill, fill: t.deep, deep: mix(t.deep, INK, 0.35) }));
      const inner = path(
        'M -4 0.5 C -2 -3.6 6.4 -4.4 10.6 1.6 C 14.4 7.2 14.8 16.4 12.6 21.2 C 10.8 25.2 6.2 25 4.4 21.4 C 2.4 17.4 2.6 10.8 -0.6 6.4 C -2.4 4 -5 3 -4 0.5 Z',
        candy(name),
      );
      return pair(geo, inner, geo.ear.dx * 0.78, geo.ear.y + 1.5, clamp(geo.ear.lean * 0.3, 0, 12), 1.2);
    },
    horns(geo) {
      return pair(geo, path('M -3.7 2 C -3.9 -4 -1.7 -9.6 2.9 -11.6 C 1.6 -7 2.4 -2.4 3.9 2 Z', candy('ivory')), geo.ear.dx * 0.72, geo.ear.y + 4.6, clamp(geo.ear.lean * 0.5, 6, 22), 1.5);
    },
    tuft(geo, c) {
      const s = hatScale(geo, 11, 2.6);
      return g(`translate(${geo.crown.x + 1} ${n(geo.crown.y + 2.6)}) scale(${n(s)})`, stroke('M 0 1 C -0.5 -6 5 -11 9.5 -8.6 C 13 -6.6 10.6 -2 7.4 -3.6', knot(c.hue), Math.max(3.4, 1.4 * c.px)));
    },
    sprout(geo, c) {
      const s = hatScale(geo, 17.6, 2.4);
      return g(
        `translate(${geo.crown.x} ${n(geo.crown.y + 2.4)}) scale(${n(s)})`,
        stroke('M 0 1.5 C 0 -3 -0.6 -6 0.4 -9.5', tones.leaf.deep, Math.max(2.1, 1.1 * c.px)) +
          path('M 0.2 -8.6 C -3 -14.5 -10.5 -14 -12 -9.8 C -8.4 -6.6 -3 -6.4 0.2 -8.6 Z', candy('leaf')) +
          path('M 0.6 -9.6 C 3 -16.8 11.6 -17.6 13.6 -12.6 C 10 -8.6 4 -7.8 0.6 -9.6 Z', candy('leaf')) +
          (c.lod > 1 ? stroke('M -1 -8.8 Q -5.5 -10.6 -9.6 -10 M 1.8 -9.8 Q 6.6 -12.4 11 -12.6', 'rgba(255,255,255,0.5)', 0.7) : ''),
      );
    },
    flower(geo, c) {
      const s = hatScale(geo, 9, 3.4);
      const petals = [0, 1, 2, 3, 4]
        .map((i) => {
          const a = ((i * 72 - 90) * Math.PI) / 180;
          return circle(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 3.8, lightFill(c.accent));
        })
        .join('');
      return g(
        `translate(${n(geo.crown.x + geo.crown.w * 0.3)} ${n(geo.crown.y + 3.4)}) rotate(${n(0.3 * DEG)}) scale(${n(s)})`,
        petals + circle(0, 0, 3, vgrad('jg-gold', [[0, tones.gold.light], [1, tones.gold.deep]])) + (c.lod > 0 ? circle(-0.9, -1, 0.9, 'rgba(255,255,255,0.8)') : ''),
      );
    },
    antenna(geo, c) {
      const s = hatScale(geo, 18.6, 2.6);
      return g(
        `translate(${geo.crown.x} ${n(geo.crown.y + 2.6)}) rotate(${n(0.12 * DEG)}) scale(${n(s)})`,
        `<g data-k="bob">${stroke('M 0 1 Q -1.2 -6 1.2 -12.5', tones.plum.fill, Math.max(1.9, 1.1 * c.px))}${path('M 1.4 -18.4 A 3.8 3.8 0 1 1 1.4 -10.8 A 3.8 3.8 0 1 1 1.4 -18.4 Z', candy(c.accent))}${
          c.lod > 0 ? circle(0.2, -15.8, 1.1, 'rgba(255,255,255,0.9)') : ''
        }</g>`,
      );
    },
    bow(geo, c) {
      const s = hatScale(geo, 7, 3.6);
      return g(
        `translate(${n(geo.crown.x + geo.crown.w * 0.24)} ${n(geo.crown.y + 3.6)}) rotate(${n(0.3 * DEG)}) scale(${n(s)})`,
        path('M 0 0 C -3 -6.4 -11 -7.4 -11.6 -1.2 C -12 4.6 -4.4 5.4 0 0 Z', candy(c.accent)) +
          path('M 0 0 C 3 -6.4 11 -7.4 11.6 -1.2 C 12 4.6 4.4 5.4 0 0 Z', candy(c.accent)) +
          (c.lod > 1 ? stroke('M -2.4 -0.2 Q -6 -1.2 -8.4 -3 M 2.4 -0.2 Q 6 -1.2 8.4 -3', 'rgba(255,255,255,0.45)', 0.8) : '') +
          rrect(-2.7, -3.1, 5.4, 6.2, 2, knot(c.accent)),
      );
    },
    partyHat(geo, c) {
      const s = hatScale(geo, 26, 4.6);
      const dots = c.lod > 0 ? [[-3, -3.6, 1.7], [3.6, -8.6, 1.5], [-1, -14, 1.3], [4.6, -1.6, 1.4], [-5.2, 0.4, 1.2]].map(([x, y, r]) => circle(x, y, r, 'rgba(255,255,255,0.85)')).join('') : '';
      return g(
        `translate(${geo.crown.x + 2} ${n(geo.crown.y + 4.6)}) rotate(${n(0.2 * DEG)}) scale(${n(s)})`,
        path('M -9 1 L -0.9 -21.4 Q 0 -22.8 0.9 -21.4 L 9 1 Q 0 3.8 -9 1 Z', candy(c.accent)) +
          dots +
          (c.lod > 0 ? stroke('M -9 1 Q 0 3.8 9 1', 'rgba(255,255,255,0.9)', 1.8) : '') +
          path('M 0 -26 A 3.4 3.4 0 1 1 0 -19.2 A 3.4 3.4 0 1 1 0 -26 Z', candy('white')),
      );
    },
    chefHat(geo, c) {
      const s = hatScale(geo, 24.6, 6.4);
      return g(
        `translate(${geo.crown.x} ${n(geo.crown.y + 6.4)}) scale(${n(s)})`,
        path('M -9.5 -6 C -14.8 -6.4 -15.4 -15.2 -9.2 -15.8 C -8.8 -21.8 -2 -24.4 1.4 -20.6 C 5.2 -24.4 12.8 -21.2 11 -15.2 C 16.6 -13.8 14.8 -6.2 9.5 -6 Z', candy('white')) +
          (c.lod > 0 ? stroke('M -4 -8.6 Q -3.4 -12.6 -1.2 -15 M 4.2 -9 Q 4.8 -12.2 7 -14', tones.white.deep, 0.9) : '') +
          rrect(-9.8, -7.4, 19.6, 8.6, 2.4, knot('white')) +
          (c.lod > 1 ? stroke('M -4.5 -6 L -4.5 -0.4 M 0 -6 L 0 -0.4 M 4.5 -6 L 4.5 -0.4', 'rgba(160,140,180,0.45)', 0.8) : ''),
      );
    },
    crown(geo, c) {
      const s = hatScale(geo, 14, 4);
      const jewels =
        c.lod > 0
          ? [[-11.2, -10.2], [0, -13.8], [11.2, -10.2]].map(([x, y]) => circle(x, y, 1.8, tones.gold.light)).join('') + oval(-2, -4.8, 4, 4.8, '#FF4F86') + circle(-0.7, -3.6, 0.7, 'rgba(255,255,255,0.9)')
          : '';
      return g(
        `translate(${geo.crown.x + 1} ${n(geo.crown.y + 4)}) rotate(${n(-0.12 * DEG)}) scale(${n(s)})`,
        path('M -10 1.5 L -11.2 -9 Q -11.3 -10 -10.4 -9.4 L -5.6 -4.6 L -0.8 -12.6 Q 0 -13.6 0.8 -12.6 L 5.6 -4.6 L 10.4 -9.4 Q 11.3 -10 11.2 -9 L 10 1.5 Q 0 3.6 -10 1.5 Z', candy('gold')) +
          jewels +
          (c.lod > 1 ? stroke('M -10.4 -1.6 Q 0 0.4 10.4 -1.6', 'rgba(190,120,0,0.5)', 1) : ''),
      );
    },
    headphones(geo, c) {
      const x = geo.crown.x;
      const dx = geo.side.dx + 0.6;
      const endY = geo.side.y - 4;
      const peak = Math.max(3, geo.top - 3.4);
      const ctrl = (peak - 0.25 * endY) / 0.75;
      const band = `M ${n(x - dx)} ${n(endY)} C ${n(x - dx)} ${n(ctrl)} ${n(x + dx)} ${n(ctrl)} ${n(x + dx)} ${n(endY)}`;
      const cups = [-1, 1]
        .map((side) =>
          g(
            `translate(${n(x + side * dx)} ${n(geo.side.y - 1)}) scale(${side} 1)`,
            (c.lod > 0 ? rrect(-4.6, -6.2, 4, 12.4, 2, tones.plum.fill) : '') +
              path('M -1.6 -7.4 L 1.8 -7.4 Q 6 -7.4 6 -3.2 L 6 3.2 Q 6 7.4 1.8 7.4 L -1.6 7.4 Q -3.4 7.4 -3.4 5.6 L -3.4 -5.6 Q -3.4 -7.4 -1.6 -7.4 Z', candy(c.accent)),
          ),
        )
        .join('');
      return (
        stroke(band, tones.plum.fill, Math.max(4.2, 1.5 * c.px)) +
        (c.lod > 1 ? stroke(band, tones.plum.light, 1, ' pathLength="100" stroke-dasharray="0 15 35 100"') : '') +
        cups
      );
    },
    halo(geo, c) {
      const y = Math.max(5, geo.top - 5);
      return g(
        `translate(${geo.crown.x} ${n(y)})`,
        `<g data-k="halo">${c.lod > 0 ? oval(-14, -4, 28, 8, 'none', ' stroke="rgba(255,226,110,0.45)" stroke-width="5"') : ''}${oval(-14, -4, 28, 8, 'none', ` stroke="${candy('gold')}" stroke-width="${n(Math.max(2.8, 1.2 * c.px))}"`)}</g>`,
      );
    },
    sweatband(geo, c) {
      const y = forehead(geo, 0.52);
      const k = 1.05;
      const clip = c.local(`<clipPath id="${c.uid}-band"><path d="${geo.d}" transform="matrix(${k} 0 0 ${k} ${n(geo.crown.x * (1 - k))} ${n(y * (1 - k))})"/></clipPath>`);
      const grad = c.local(
        `<linearGradient id="${c.uid}-sweat" gradientUnits="userSpaceOnUse" x1="0" y1="${n(y - 4)}" x2="0" y2="${n(y + 8)}">${stops([[0, tones[c.accent].light], [0.5, tones[c.accent].fill], [1, tones[c.accent].deep]])}</linearGradient>`,
      );
      const curve = (dy) => `M ${n(geo.left - 3)} ${n(y + dy)} Q ${geo.crown.x} ${n(y + dy + 5)} ${n(geo.right + 3)} ${n(y + dy)}`;
      return (
        `<g clip-path="${clip}">${stroke(curve(0), grad, 9, ' stroke-linecap="butt"')}${c.lod > 0 ? stroke(`${curve(-2.1)} ${curve(2.1)}`, 'rgba(255,255,255,0.9)', 1.3, ' stroke-linecap="butt"') : ''}</g>` +
        (c.lod > 1
          ? g(
              `translate(${n(geo.crown.x + geo.side.dx * 0.64)} ${n(y + 8.5)})`,
              path('M 0 -2.8 C 1.5 -0.7 2.1 0.6 2.1 1.4 A 2.1 2.1 0 0 1 -2.1 1.4 C -2.1 0.6 -1.5 -0.7 0 -2.8 Z', '#9EE3FF') + circle(-0.6, 1, 0.6, '#fff'),
              ' data-k="drip"',
            )
          : '')
      );
    },
    gradCap(geo, c) {
      const s = hatScale(geo, 12.4, 4.4);
      return g(
        `translate(${geo.crown.x} ${n(geo.crown.y + 4.4)}) rotate(${n(-0.08 * DEG)}) scale(${n(s)})`,
        path('M -9 -3.5 L -9 1.4 Q 0 4.4 9 1.4 L 9 -3.5 Z', candy('plum')) +
          (c.lod > 0 ? path('M -17 -6 L 0 0 L 17 -6 L 17 -4.6 L 0 1.5 L -17 -4.6 Z', tones.plum.deep) : '') +
          path('M -17 -6 L 0 -12 L 17 -6 L 0 0 Z', lightFill('plum')) +
          stroke('M 0 -6 Q 8 -7 12.6 -5.2 L 12.6 3', tones.gold.fill, Math.max(1, 0.7 * c.px)) +
          rrect(11.2, 2, 2.8, 5.4, 1.2, tones.gold.fill) +
          circle(0, -6, 1.4, tones[c.accent].fill),
      );
    },
    beanie(geo, c) {
      const x = geo.crown.x;
      const cut = forehead(geo, 0.7);
      const hw = Math.min(widthOf(geo, cut) / 2 + 2.6, Math.max(22, geo.crown.w * 0.85));
      const top = Math.max(12, geo.top - 7);
      const a = tones[c.accent];
      const knit = derived(`knit-${c.accent}`, () => ({ light: mix(a.light, '#FFFFFF', 0.25), fill: a.light, deep: a.fill }));
      const dome = `M ${n(x - hw)} ${n(cut)} C ${n(x - hw)} ${n(top + 7)} ${n(x - hw * 0.6)} ${n(top)} ${x} ${n(top)} C ${n(x + hw * 0.6)} ${n(top)} ${n(x + hw)} ${n(top + 7)} ${n(x + hw)} ${n(cut)} Z`;
      const rim = `M ${n(x - hw - 1.2)} ${n(cut - 6)} Q ${x} ${n(cut - 2.6)} ${n(x + hw + 1.2)} ${n(cut - 6)} L ${n(x + hw + 1.2)} ${n(cut + 0.4)} Q ${x} ${n(cut + 4)} ${n(x - hw - 1.2)} ${n(cut + 0.4)} Z`;
      const rib = `M ${n(x - hw - 1.2)} ${n(cut - 2.8)} Q ${x} ${n(cut + 0.7)} ${n(x + hw + 1.2)} ${n(cut - 2.8)}`;
      const domeClip = c.lod > 1 ? c.local(`<clipPath id="${c.uid}-dome"><path d="${dome}"/></clipPath>`) : '';
      const rimClip = c.lod > 0 ? c.local(`<clipPath id="${c.uid}-rim"><path d="${rim}"/></clipPath>`) : '';
      return (
        path(dome, candy(c.accent)) +
        (c.lod > 1 ? `<g clip-path="${domeClip}">${stroke(`M ${n(x - hw)} ${n(top + 1)} L ${n(x + hw)} ${n(top + 1)}`, 'rgba(0,0,0,0.07)', (cut - top) * 2, ' stroke-linecap="butt" stroke-dasharray="1.2 3.4"')}</g>` : '') +
        path(rim, candy(knit)) +
        (c.lod > 0 ? `<g clip-path="${rimClip}">${stroke(rib, alpha(a.deep, 0.22), 8, ' stroke-linecap="butt" stroke-dasharray="1.4 1.9"')}</g>` : '') +
        path(`M ${x} ${n(top - 10.5)} A 5.6 5.6 0 1 1 ${x} ${n(top + 0.7)} A 5.6 5.6 0 1 1 ${x} ${n(top - 10.5)} Z`, candy(knit))
      );
    },
    propeller(geo, c) {
      const s = hatScale(geo, 14.4, 4.2);
      const dome = 'M -9.5 1 C -9.5 -5.4 -5 -8.6 0 -8.6 C 5 -8.6 9.5 -5.4 9.5 1 Q 0 3 -9.5 1 Z';
      const clip = c.local(`<clipPath id="${c.uid}-prop"><path d="${dome}"/></clipPath>`);
      const shine = vgrad('j-shine', [[0, '#fff', 0.45], [0.5, '#fff', 0], [1, '#000', 0.15]]);
      const blade = vgrad(`jbl-${c.accent}`, [[0, tones[c.accent].light], [1, tones[c.accent].deep]]);
      return g(
        `translate(${geo.crown.x} ${n(geo.crown.y + 4.2)}) rotate(${n(0.1 * DEG)}) scale(${n(s)})`,
        `<g clip-path="${clip}"><rect x="-10" y="-10" width="6.8" height="14" fill="#FF5C6C"/><rect x="-3.2" y="-10" width="6.4" height="14" fill="${tones.gold.fill}"/><rect x="3.2" y="-10" width="6.8" height="14" fill="#4B8BFF"/>${path(dome, shine)}</g>` +
          stroke('M 0 -8.4 L 0 -11.8', tones.plum.fill, Math.max(1.4, 0.8 * c.px)) +
          `<g data-k="spin">${oval(-10.4, -14, 9.6, 3.8, blade)}${oval(0.8, -14, 9.6, 3.8, blade)}</g>` +
          circle(0, -12.1, 1.6, tones.plum.fill),
      );
    },
  };

  /* ---------- Neckwear and coats: character/wear.tsx ---------- */

  function band(geo, c, y, thickness, toneName, stripes, key) {
    const k = 1.05;
    const clip = c.local(`<clipPath id="${c.uid}-${key}"><path d="${geo.d}" transform="matrix(${k} 0 0 ${k} ${n(geo.face.x * (1 - k))} ${n(y * (1 - k))})"/></clipPath>`);
    const t = tones[toneName];
    const grad = c.local(
      `<linearGradient id="${c.uid}-${key}g" gradientUnits="userSpaceOnUse" x1="0" y1="${n(y - thickness / 2)}" x2="0" y2="${n(y + thickness / 2 + 2)}">${stops([[0, t.light], [0.5, t.fill], [1, t.deep]])}</linearGradient>`,
    );
    const curve = `M ${n(geo.left - 4)} ${n(y - 1.2)} Q ${geo.face.x} ${n(y + 3.4)} ${n(geo.right + 4)} ${n(y - 1.2)}`;
    return `<g clip-path="${clip}">${stroke(curve, grad, thickness, ' stroke-linecap="butt"')}${
      stripes ? stroke(curve, 'rgba(255,255,255,0.4)', thickness, ' stroke-linecap="butt" stroke-dasharray="2.2 3.6"') : ''
    }</g>`;
  }

  function neckwear(geo, c, neck) {
    const x = geo.face.x;
    const y = geo.neck.y;
    const s = Math.min(1, Math.max(0.72, geo.neck.w / 56)) * geo.face.s * Math.min(1.3, Math.max(0.75, geo.neck.room / 11));
    const at = (dx, dy, extra = '') => `translate(${n(x + dx)} ${n(y + dy)})${extra} scale(${n(s)})`;
    switch (neck) {
      case 'bowtie':
        return g(
          at(0, 0),
          path('M -1.5 0 L -8.6 -4.8 Q -10.4 -5.6 -10.4 -3.6 L -10.4 3.6 Q -10.4 5.6 -8.6 4.8 Z', candy(c.accent)) +
            path('M 1.5 0 L 8.6 -4.8 Q 10.4 -5.6 10.4 -3.6 L 10.4 3.6 Q 10.4 5.6 8.6 4.8 Z', candy(c.accent)) +
            rrect(-2.6, -2.9, 5.2, 5.8, 1.8, knot(c.accent)),
        );
      case 'tie': {
        const blade = 'M -2 2.2 L 2 2.2 L 3.9 12.4 L 0 16.2 L -3.9 12.4 Z';
        const bladeClip = c.lod > 0 ? c.local(`<clipPath id="${c.uid}-tie"><path d="${blade}"/></clipPath>`) : '';
        return `<g clip-path="url(#${c.uid}-body)">${g(
          at(0, -2.4),
          path(blade, candy(c.accent)) +
            (c.lod > 0 ? `<g clip-path="${bladeClip}">${stroke('M -5 6 L 5 3 M -5 10.5 L 5 7.5 M -5 15 L 5 12', 'rgba(255,255,255,0.4)', 1.3, ' stroke-linecap="butt"')}</g>` : '') +
            path('M -3 -2.2 L 3 -2.2 L 2.1 2.4 L -2.1 2.4 Z', candy(c.accent)),
        )}</g>`;
      }
      case 'scarf':
        return (
          band(geo, c, y, 6.6, c.accent, c.lod > 0, 'scarf') +
          g(
            `translate(${n(x + geo.neck.w * 0.2)} ${n(y + 1)}) rotate(${n(-0.14 * DEG)}) scale(${n(s)})`,
            path('M -3.2 0 L 3.2 0 L 3.2 10.4 Q 3.2 11.8 1.8 11.8 L -1.8 11.8 Q -3.2 11.8 -3.2 10.4 Z', candy(c.accent)) +
              (c.lod > 0 ? stroke('M 0 0 L 0 12', 'rgba(255,255,255,0.4)', 6.4, ' stroke-linecap="butt" stroke-dasharray="2.2 3.6"') : ''),
          )
        );
      case 'collar':
        return (
          band(geo, c, y - 1, 3.4, c.accent, false, 'collar') +
          g(
            at(0, 1.2),
            circle(0, 0.6, 1.3, 'none', ` stroke="${tones.gold.deep}" stroke-width="0.8"`) +
              path('M 0 1.4 A 3.1 3.1 0 1 1 0 7.6 A 3.1 3.1 0 1 1 0 1.4 Z', candy('gold')) +
              (c.lod > 0 ? circle(-1, 3.6, 0.8, 'rgba(255,255,255,0.85)') : ''),
            ' data-k="tag"',
          )
        );
      case 'bib':
        return `<g clip-path="url(#${c.uid}-body)">${g(
          at(0, -0.6),
          path('M -11 -2 Q 0 1.2 11 -2 Q 11 9.6 0 10.4 Q -11 9.6 -11 -2 Z', candy('white')) +
            (c.lod > 0 ? stroke('M -11 -2 Q -11 9.6 0 10.4 Q 11 9.6 11 -2', tones[c.accent].fill, 1.3) : '') +
            (c.lod > 1 ? [[-4.6, 3.4], [0, 5.6], [4.6, 3.4]].map(([cx, cy]) => circle(cx, cy, 1, alpha(tones[c.accent].fill, 0.8))).join('') : ''),
        )}</g>`;
      case 'medal':
        return g(
          `translate(${n(x)} ${n(y - 2.6)}) scale(${n(s * 0.8)})`,
          path('M -6.4 -2 L -1.4 6 L 1.6 6 L -3.4 -2 Z', tones[c.accent].fill) +
            path('M 6.4 -2 L 1.4 6 L -1.6 6 L 3.4 -2 Z', tones[c.accent].deep) +
            `<g data-k="medal">${path('M 0 4.4 A 4.6 4.6 0 1 1 0 13.6 A 4.6 4.6 0 1 1 0 4.4 Z', candy('gold'))}${
              c.lod > 0 ? path('M 0 6.3 L 0.8 8.2 L 2.8 8.3 L 1.2 9.5 L 1.8 11.5 L 0 10.3 L -1.8 11.5 L -1.2 9.5 L -2.8 8.3 L -0.8 8.2 Z', tones.gold.light) : ''
            }</g>`,
        );
      default:
        return '';
    }
  }

  const SPARKLE = 'M 0 -1 Q 0.16 -0.16 1 0 Q 0.16 0.16 0 1 Q -0.16 0.16 -1 0 Q -0.16 -0.16 0 -1 Z';

  function coat(geo, c, surface) {
    const spots = geo.spots[surface] || [];
    const t = tones[c.hue];
    switch (surface) {
      case 'sprinkles':
        return c.lod === 0
          ? ''
          : spots
              .filter((s) => s[4] !== t.fill)
              .slice(0, c.lod > 1 ? 16 : 10)
              .map(([x, y, , turn, color]) => rrect(-0.95, -2.7, 1.9, 5.4, 0.95, color, ` transform="translate(${x} ${y}) rotate(${n(turn * DEG)})"`))
              .join('');
      case 'spots':
        return spots
          .slice(0, c.lod === 0 ? 3 : 5)
          .map(([x, y, r]) => circle(x, y, r, alpha(mix(t.fill, '#FFFFFF', 0.5), 0.75)))
          .join('');
      case 'stripes':
        return g(
          `translate(50 60) rotate(${n(-0.55 * DEG)})`,
          Array.from({ length: 11 }, (_, i) => `<rect x="${-66 + i * 12}" y="-60" width="${c.lod === 0 ? 6 : 5}" height="120" fill="rgba(255,255,255,0.24)"/>`).join(''),
        );
      case 'sugar':
        return c.lod === 0
          ? ''
          : spots
              .slice(0, c.lod > 1 ? 60 : 32)
              .map(([x, y, r, , , o]) => circle(x, y, r, '#fff', ` opacity="${o}"`))
              .join('');
      case 'belly': {
        const h = geo.bottom - geo.top;
        const fill = rgrad(`jbe-${c.hue}`, [[0, t.light, 0.62], [0.7, t.light, 0.55], [1, t.light, 0]]);
        return oval(geo.face.x - geo.neck.w * 0.38, geo.bottom - h * 0.43, geo.neck.w * 0.76, h * 0.42, fill);
      }
      case 'sparkle':
        return spots
          .slice(0, c.lod === 0 ? 1 : 3)
          .map(([x, y, r]) => path(SPARKLE, 'rgba(255,255,255,0.95)', ` transform="translate(${x} ${y}) scale(${r})"`))
          .join('');
      default:
        return '';
    }
  }

  /* ---------- Drawing a whole character: Gummy.tsx ---------- */

  let uidCounter = 0;

  /** The SVG markup of `spec` at `size` pixels. */
  function drawJelly(spec, size, shadow) {
    const geo = geoOf(spec);
    const look = spec.look;
    const hue = spec.hue;
    const lod = lodFor(size);
    const uid = `jy${++uidCounter}`;
    const local = [];
    const c = {
      hue,
      accent: accentHue[hue],
      lod,
      px: 100 / size,
      uid,
      local(markup) {
        local.push(markup);
        const id = markup.match(/id="([^"]+)"/)[1];
        return `url(#${id})`;
      },
    };
    const t = tones[hue];
    const h = geo.bottom - geo.top;
    const w = geo.right - geo.left;
    const faceScale = geo.face.s * (size < 44 ? 1.22 : size < 64 ? 1.08 : 1);
    const face = `translate(${geo.face.x} ${geo.face.y}) scale(${n(faceScale)})`;
    const fc = { ...c, px: c.px / faceScale };
    local.push(`<clipPath id="${uid}-body"><path d="${geo.d}"/></clipPath>`);

    const glow = rgrad(`jgl-${hue}`, [[0, t.deep, 0.4, 'jglow'], [0.6, t.deep, 0.2, 'jglow-mid'], [1, t.deep, 0]]);
    const rim = vgrad('j-rim', [[0, '#fff', 0.7], [0.22, '#fff', 0.15], [0.4, '#fff', 0]]);
    const shade = vgrad(`jsd-${hue}`, [[0.5, t.deep, 0], [1, t.deep, 0.55]]);
    const inner = rgrad(`jin-${hue}`, [[0, t.light, 0.55], [1, t.light, 0]]);
    const gloss = rgrad('j-gloss', [[0, '#fff', 0.8], [0.62, '#fff', 0.7], [1, '#fff', 0]]);

    const topper = look.topper !== 'none' && toppers[look.topper] ? toppers[look.topper](geo, c) : '';
    const behind = BEHIND.has(look.topper);
    const crown = geo.crown;
    const sparkles = lod > 0
      ? [
          [crown.x - crown.w * 0.62, crown.y - 3, 4.4],
          [crown.x + crown.w * 0.66, crown.y - 7, 5.2],
          [crown.x - crown.w * 0.3, crown.y - 16, 3.4],
          [crown.x + crown.w * 0.24, crown.y - 19, 3],
        ]
          .map(([x, y, s]) => `<g data-k="sparkle" data-x="${n(x)}" data-y="${n(Math.max(1.5 * s, y))}" data-s="${s}">${path(SPARKLE, '#FFF6B8')}</g>`)
          .join('')
      : '';

    const body =
      (shadow ? oval(geo.face.x - w * 0.48, geo.bottom - 9, w * 0.96, 15, glow) : '') +
      (behind ? `<g data-k="dress">${topper}</g>` : '') +
      `<path data-k="body" d="${geo.d}" fill="${bodyPaint(hue)}"/>` +
      `<g class="skin" clip-path="url(#${uid}-body)">` +
      coat(geo, c, look.surface) +
      `<path d="${geo.d}" fill="none" stroke="${shade}" stroke-width="${n(h * 0.22)}"/>` +
      oval(geo.face.x + 2 - w * 0.42, geo.top + h * 0.8 - w * 0.3, w * 0.84, w * 0.6, inner) +
      `<path d="${geo.d}" fill="none" stroke="${rim}" stroke-width="3.2"/>` +
      g(`translate(${geo.gloss.x} ${geo.gloss.y}) rotate(${geo.gloss.angle})`, oval(-geo.gloss.w / 2, -geo.gloss.w * 0.18, geo.gloss.w, geo.gloss.w * 0.36, gloss)) +
      circle(geo.glint.x, geo.glint.y, 1.9, 'rgba(255,255,255,0.8)') +
      g(face, cheeks(c, look.surface === 'freckles', look.eyes === 'glasses' ? 21 : 19.5)) +
      `</g>` +
      neckwear(geo, c, look.neck) +
      g(face, (eyes[look.eyes] || eyes.dot)(fc) + mouth(look.mouth, fc, mouthDrop[look.eyes] || 0)) +
      (behind ? '' : `<g data-k="dress">${topper}</g>`) +
      (sparkles ? `<g data-k="sparkles" opacity="0">${sparkles}</g>` : '');

    return `<svg class="jelly-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs>${local.join('')}</defs><g data-k="ghost">${body}</g></svg>`;
  }

  /** The body outline as an empty dashed dimple, for slots whose jelly is away. */
  function mouldSvg(spec) {
    return `<svg class="jelly-mould" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="${geoOf(spec).d}"/></svg>`;
  }

  /* ---------- Animation engine: tweens, springs and sequences ---------- */

  const springs = {
    jelly: { damping: 7, stiffness: 260, mass: 0.7 },
    wobble: { damping: 5, stiffness: 180, mass: 0.6 },
    snappy: { damping: 18, stiffness: 320, mass: 0.8 },
    soft: { damping: 14, stiffness: 140, mass: 1 },
  };

  function bezier(x1, y1, x2, y2) {
    const ax = 3 * x1 - 3 * x2 + 1;
    const bx = 3 * x2 - 6 * x1;
    const cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1;
    const by = 3 * y2 - 6 * y1;
    const cy = 3 * y1;
    return (x) => {
      let t = x;
      for (let i = 0; i < 6; i++) {
        const fx = ((ax * t + bx) * t + cx) * t - x;
        const d = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(d) < 1e-6) break;
        t = clamp(t - fx / d, 0, 1);
      }
      return ((ay * t + by) * t + cy) * t;
    };
  }

  const ease = {
    linear: (t) => t,
    outQuad: (t) => t * (2 - t),
    inQuad: (t) => t * t,
    outCubic: (t) => 1 - (1 - t) ** 3,
    inOutSin: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    flight: bezier(0.33, 0, 0.2, 1),
    bezier,
  };

  /** Steps for `Value.go`: a tween, a spring, a pause, or a callback. */
  const T = (to, ms, e = ease.linear) => ({ to, ms, ease: e });
  const S = (to, spring = springs.wobble) => ({ to, spring });
  const W = (ms) => ({ wait: ms });
  const C = (fn) => ({ call: fn });

  const active = new Set();
  const dirty = new Set();
  const frameHooks = new Set();
  let frame = 0;
  let lastTime = 0;

  function kick() {
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    for (const value of [...active]) value.advance(dt);
    for (const hook of [...frameHooks]) if (hook(now) === false) frameHooks.delete(hook);
    for (const ch of dirty) ch.render();
    dirty.clear();
    frame = active.size || frameHooks.size ? requestAnimationFrame(tick) : 0;
  }

  /** Runs `fn(now)` every frame until it returns false. */
  function onFrame(fn) {
    frameHooks.add(fn);
    kick();
  }

  /** An animatable number. `onChange` runs whenever it moves. */
  class Value {
    constructor(v, onChange) {
      this.v = v;
      this.vel = 0;
      this.q = [];
      this.onChange = onChange;
    }
    set(v) {
      this.q = [];
      this.vel = 0;
      active.delete(this);
      if (v !== this.v) {
        this.v = v;
        this.onChange?.();
      }
      return this;
    }
    go(...steps) {
      this.q = steps.map((s) => ({ ...s }));
      active.add(this);
      kick();
      return this;
    }
    get busy() {
      return this.q.length > 0;
    }
    advance(dt) {
      const before = this.v;
      while (this.q.length) {
        const s = this.q[0];
        if (!s.started) {
          s.started = true;
          s.t = 0;
          s.from = this.v;
        }
        if (s.call) {
          this.q.shift();
          s.call();
          continue;
        }
        if (s.wait !== undefined) {
          const left = s.wait / 1000 - s.t;
          if (dt < left) {
            s.t += dt;
            dt = 0;
            break;
          }
          dt -= left;
          this.vel = 0;
          this.q.shift();
          continue;
        }
        if (s.spring) {
          const { damping, stiffness, mass = 1 } = s.spring;
          let x = this.v;
          let v = this.vel;
          for (let left = dt; left > 0; left -= 1 / 240) {
            const h = Math.min(1 / 240, left);
            v += ((-stiffness * (x - s.to) - damping * v) / mass) * h;
            x += v * h;
          }
          this.v = x;
          this.vel = v;
          if (Math.abs(x - s.to) < 0.0008 && Math.abs(v) < 0.02) {
            this.v = s.to;
            this.vel = 0;
            this.q.shift();
          }
          break;
        }
        const span = s.ms / 1000;
        const prev = this.v;
        if (s.t + dt >= span) {
          dt -= span - s.t;
          this.v = s.to;
          this.vel = span > 0 ? (s.to - prev) / Math.max(1e-3, span - s.t) : 0;
          this.q.shift();
          continue;
        }
        s.t += dt;
        this.v = s.from + (s.to - s.from) * s.ease(s.t / span);
        this.vel = dt > 0 ? (this.v - prev) / dt : 0;
        break;
      }
      if (!this.q.length) active.delete(this);
      if (this.v !== before) this.onChange?.();
    }
  }

  /* ---------- Personalities: character/idle.ts ---------- */

  function hop(ch, heights = [1]) {
    const v = ch.v;
    v.hop.go(...heights.flatMap((height) => [W(90), T(height, 210, ease.outQuad), T(0, 190, ease.inQuad), W(170)]));
    v.squash.go(...heights.flatMap(() => [T(0.12, 90), T(-0.1, 110), T(0, 170), W(110), T(0.16, 60), T(0, 120)]), S(0, springs.wobble));
    return 660 * heights.length + 200;
  }

  function yawn(ch) {
    const v = ch.v;
    v.yawn.go(T(1, 420), W(520), T(0, 320));
    v.blink.go(T(0.3, 380), W(700), T(1, 260));
    v.squash.go(T(-0.07, 420), W(520), S(0, springs.soft));
    return 1500;
  }

  function nodOff(ch) {
    const v = ch.v;
    v.blink.go(T(0.12, 1400, ease.inOutSin), W(500), T(1.2, 90), S(1, { damping: 8, stiffness: 300 }));
    v.hop.go(W(1900), T(0.22, 90), T(0, 160));
    v.lookY.go(T(0.4, 900), W(1000), T(0, 150));
    return 2400;
  }

  function shiver(ch) {
    ch.v.shiver.go(...[1, -1, 1, -1, 0.7, -0.7, 0.4, 0].map((x) => T(x, 42)));
    return 400;
  }

  function puff(ch) {
    const v = ch.v;
    v.puff.go(T(1, 520, ease.outCubic), W(900), S(0, springs.wobble));
    v.lookY.go(T(-0.7, 400), W(1050), T(0, 300));
    v.blink.go(T(0.55, 300), W(1150), T(1, 200));
    return 1800;
  }

  function tilt(ch) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const v = ch.v;
    v.tilt.go(S(side * 10, springs.soft), W(1300), S(0, springs.soft));
    v.lookX.go(S(side * 0.9, springs.soft), W(1300), S(0, springs.soft));
    v.lookY.go(T(-0.3, 300), W(1300), T(0, 300));
    return 2000;
  }

  function sway(ch) {
    const v = ch.v;
    v.tilt.go(T(-4, 1100, ease.inOutSin), T(4, 2000, ease.inOutSin), T(0, 1100, ease.inOutSin));
    v.lookY.go(T(-0.8, 900, ease.inOutSin), W(2400), T(0, 900, ease.inOutSin));
    v.lookX.go(T(-0.5, 1100, ease.inOutSin), T(0.5, 2000, ease.inOutSin), T(0, 1100, ease.inOutSin));
    return 4200;
  }

  function wiggle(ch) {
    ch.v.tilt.go(...[-7, 7, -6, 6, -4, 3, 0].map((x) => T(x, 95)));
    ch.v.squash.go(...[0.06, -0.04, 0.05, -0.03, 0].map((x) => T(x, 130)));
    return 700;
  }

  const personalities = {
    bouncy: { blink: [2400, 5200], twice: 0.2, glance: [1600, 3600], reach: 1, every: [3200, 7000], move: (ch) => hop(ch, Math.random() < 0.35 ? [0.6, 1] : [1]) },
    dozy: { blink: [3200, 6500], twice: 0.05, glance: [4200, 8000], reach: 0.5, every: [6500, 12000], move: (ch) => (Math.random() < 0.6 ? yawn(ch) : nodOff(ch)) },
    jittery: { blink: [1300, 3200], twice: 0.45, glance: [600, 1500], reach: 1.1, every: [3500, 7500], move: shiver },
    proud: { blink: [3000, 6000], twice: 0.1, glance: [2800, 5500], reach: 0.7, every: [6000, 11000], move: puff },
    curious: { blink: [2400, 5000], twice: 0.2, glance: [1100, 2600], reach: 1.1, every: [3500, 7000], move: tilt },
    dreamy: { blink: [3200, 6200], twice: 0.1, glance: [3000, 6000], reach: 0.6, every: [5500, 9500], move: sway },
    wiggly: { blink: [2400, 5000], twice: 0.25, glance: [1800, 3800], reach: 1, every: [3500, 7500], move: wiggle },
  };

  /* ---------- Characters ---------- */

  const all = new Set();
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const ch = e.target.jelly;
        if (ch) ch.visible = e.isIntersecting;
        e.target.classList.toggle('is-offscreen', !e.isIntersecting);
      }
    },
    { rootMargin: '80px' },
  );

  /**
   * A jelly on the page: `el` holds the character, `v` its animatable face and body.
   * `spec` is { hue, glyph, look, geo, seed } (see JellyData.cast).
   */
  class Character {
    constructor(spec, { size = 84, mood = 'asleep', shadow = true, sticker = size >= 36, calm = false } = {}) {
      this.spec = spec;
      this.size = size;
      this.shadow = shadow;
      this.showSticker = sticker;
      this.calm = calm;
      this.visible = true;
      this.busyUntil = 0;
      this.followUntil = 0;
      this.timers = new Set();
      const touch = () => dirty.add(this);
      const value = (x) => new Value(x, touch);
      const awake = mood === 'awake' ? 1 : 0;
      this.v = {
        awake: value(awake),
        blink: value(1),
        lookX: value(0),
        lookY: value(0),
        yawn: value(0),
        hop: value(0),
        squash: value(0),
        tilt: value(0),
        puff: value(0),
        shiver: value(0),
        plop: value(0),
        lift: value(0),
        dress: value(1),
        fade: value(1),
      };
      this.el = document.createElement('span');
      this.el.className = 'jelly';
      this.el.style.setProperty('--size', `${size}px`);
      this.el.jelly = this;
      this.move = document.createElement('span');
      this.move.className = 'jelly-move';
      this.el.append(this.move);
      this.build();
      seen.observe(this.el);
      all.add(this);
    }

    /** Redraws the SVG for the current spec, keeping the animation state. */
    build() {
      this.move.innerHTML = drawJelly(this.spec, this.size, this.shadow);
      const sticker = this.showSticker && this.spec.glyph;
      if (sticker) {
        const badge = Math.max(23, this.size * 0.32);
        const s = document.createElement('span');
        s.className = 'jelly-sticker';
        s.textContent = this.spec.glyph;
        s.style.cssText = `width:${badge}px;height:${badge}px;right:${n(this.size * 0.28 - badge)}px;bottom:${n(this.size * 0.02 - (badge - this.size * 0.32) * 0.3)}px;font-size:${n(badge * 0.62)}px;--lean:${(hashSeed(this.spec.seed || 'x') % 24) - 12}deg`;
        this.move.append(s);
        this.sticker = s;
      } else {
        this.sticker = null;
      }
      this.parts = [...this.move.querySelectorAll('[data-k]')].map((el) => ({ el, k: el.dataset.k, d: el.dataset, last: '' }));
      this.render(true);
    }

    setSpec(spec) {
      this.spec = spec;
      this.build();
    }

    render(force = false) {
      const v = this.v;
      const s = this.size;
      const plop = v.plop.v;
      const sx = (1 + v.puff.v * 0.07 + v.squash.v * 0.12) * (1 + plop * 0.7);
      const sy = (1 + v.puff.v * 0.07 - v.squash.v * 0.12) * (1 - plop);
      const transform = `translate(${n(v.shiver.v * s * 0.014)}px,${n(-v.hop.v * s * 0.14 - v.lift.v)}px) rotate(${n(v.tilt.v)}deg) scale(${n(sx * 1000) / 1000},${n(sy * 1000) / 1000})`;
      if (force || transform !== this.lastMove) {
        this.move.style.transform = transform;
        this.lastMove = transform;
      }
      const awake = v.awake.v;
      const blink = Math.max(0.06, v.blink.v);
      const lx = v.lookX.v;
      const ly = v.lookY.v;
      const yawnV = v.yawn.v;
      const dress = v.dress.v;
      const pop = dress >= 0.999 ? 0 : Math.sin(Math.PI * Math.min(1, Math.max(0, dress)));
      for (const p of this.parts) {
        let attr = 'transform';
        let val;
        switch (p.k) {
          case 'open':
            attr = 'opacity';
            val = n(awake);
            break;
          case 'shut':
            attr = 'opacity';
            val = n(1 - awake);
            break;
          case 'eye': {
            const r = +p.d.r;
            val = `translate(${n(+p.d.x + lx * r)} ${n(+p.d.y + ly * r * 0.8)}) scale(1 ${n(blink)})`;
            break;
          }
          case 'lid':
            val = `translate(${p.d.x} ${p.d.y}) scale(1 ${n(blink)})`;
            break;
          case 'pupil':
            val = `translate(${n(lx * +p.d.gx)} ${n(+p.d.oy + ly * +p.d.gy)})`;
            break;
          case 'shades': {
            const up = 1 - awake;
            val = `translate(${n(lx * 1.2)} ${n(EY - up * 13)}) scale(${n(1 - up * 0.12)})`;
            break;
          }
          case 'mouth':
            attr = 'opacity';
            val = n(1 - yawnV);
            break;
          case 'yawn':
            val = `translate(0 ${n(11.2 + +p.d.drop)}) scale(1 ${Math.max(0.001, n(yawnV))})`;
            break;
          case 'dress':
            val = `translate(0 ${n(-(1 - dress) * 16)})`;
            if (force || val !== p.last) p.el.setAttribute('opacity', n(clamp(dress * 2.5, 0, 1)));
            break;
          case 'sparkles':
            attr = 'opacity';
            val = n(pop);
            break;
          case 'sparkle': {
            const sc = +p.d.s * (0.4 + pop * 0.8);
            val = `translate(${p.d.x} ${p.d.y}) scale(${n(sc)}) rotate(${n(pop * DEG)})`;
            break;
          }
          case 'body':
            attr = 'fill-opacity';
            val = n(v.fade.v);
            break;
          default:
            continue;
        }
        if (force || val !== p.last) {
          p.el.setAttribute(attr, val);
          p.last = val;
        }
      }
    }

    /** Opens the eyes with a little startled blink. */
    wake() {
      const v = this.v;
      v.yawn.go(T(0, 120));
      v.awake.go(T(1, 140));
      v.blink.go(T(1.25, 120), S(1, { damping: 8, stiffness: 300 }));
    }

    /** A yawn, then the eyes fall shut. */
    sleep(delay = 0) {
      const v = this.v;
      v.lookX.go(T(0, 200));
      v.lookY.go(T(0, 200));
      v.yawn.go(W(delay), T(1, 260), W(260), T(0, 220));
      v.awake.go(W(delay + 160), T(0, 420));
    }

    get personality() {
      return personalities[this.spec.look.motion] || personalities.bouncy;
    }

    /** Plays the personality's signature move; returns how long it takes. */
    perform() {
      const ms = this.personality.move(this);
      this.busyUntil = performance.now() + ms;
      return ms;
    }

    /** Glances toward a point on screen, like the app's random glances but aimed. */
    lookAt(x, y, hold = 2200) {
      const r = this.el.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2);
      const dy = y - (r.top + r.height * 0.6);
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1.1, this.personality.reach + 0.25);
      const k = Math.min(1, d / (r.width * 1.6));
      const spring = { damping: 12, stiffness: 160 };
      this.v.lookX.go(S(clamp((dx / d) * k * reach, -1.1, 1.1), spring));
      this.v.lookY.go(S(clamp((dy / d) * k * reach * 0.9, -1, 1), spring));
      this.followUntil = performance.now() + hold;
    }

    /** Blinks, glances and (unless calm or reduced motion) does its thing now and then. */
    lively(on = true) {
      for (const t of this.timers) clearTimeout(t);
      this.timers.clear();
      this.isLively = on;
      if (!on) return;
      const later = (ms, fn) => {
        const t = setTimeout(() => {
          this.timers.delete(t);
          if (this.isLively) fn();
        }, ms);
        this.timers.add(t);
      };
      const pause = ([lo, hi]) => lo + Math.random() * (hi - lo);
      const free = () => this.visible && !document.hidden && performance.now() > this.busyUntil && this.v.awake.v > 0.5;
      const blink = () => {
        if (free() && !this.v.blink.busy) {
          const shut = [T(0, 70), T(1, 110)];
          this.v.blink.go(...(Math.random() < this.personality.twice ? [...shut, W(90), ...shut] : shut));
        }
        later(pause(this.personality.blink), blink);
      };
      const glance = () => {
        if (free() && performance.now() > this.followUntil) {
          const centre = Math.random() < 0.35;
          const reach = this.personality.reach;
          const spring = { damping: 12, stiffness: 160 };
          this.v.lookX.go(S(centre ? 0 : (Math.random() * 2 - 1) * reach, spring));
          this.v.lookY.go(S(centre ? 0 : (Math.random() * 1.2 - 0.6) * reach, spring));
        }
        later(pause(this.personality.glance), glance);
      };
      const move = () => {
        if (free() && !this.calm && !reduceMotion.matches) this.perform();
        later(pause(this.personality.every), move);
      };
      later(1200 + Math.random() * 1500, blink);
      later(900 + Math.random() * 2000, glance);
      later(pause(this.personality.every) * 0.5, move);
    }

    /** The new topper drops in with four sparkles (Gummy.tsx useDress). */
    dressUp() {
      this.v.dress.go(T(0, 0), S(1, { damping: 9, stiffness: 150 }));
    }

    /** A quick squish where a finger presses. */
    press(down) {
      this.v.plop.go(down ? S(0.15, springs.snappy) : S(0, springs.wobble));
    }

    /** Lands with a squash that jiggles out. */
    land(amount = 0.22) {
      this.v.plop.go(T(amount, 60), S(0, springs.wobble));
    }
  }

  /* ---------- Looking at the pointer ---------- */

  let pointerFrame = 0;
  const pointer = { x: 0, y: 0 };
  function followPointer(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      for (const ch of all) {
        if (ch.isLively && ch.visible && ch.v.awake.v > 0.5 && performance.now() > ch.busyUntil) ch.lookAt(pointer.x, pointer.y);
      }
    });
  }
  addEventListener('pointermove', (e) => e.pointerType === 'mouse' && followPointer(e), { passive: true });
  addEventListener('pointerdown', followPointer, { passive: true });

  /* ---------- Mounting ---------- */

  /** A fresh copy of a cast member's spec, by key. */
  function spec(key) {
    const c = DATA.cast[key];
    return c ? { ...c, look: { ...c.look } } : null;
  }

  /** Turns `el` (with data-jelly="castKey") into a character. */
  function mount(el, options = {}) {
    if (el.jelly) return el.jelly;
    const s = spec(el.dataset.jelly);
    if (!s) return null;
    const size = Number(el.dataset.size) || el.clientWidth || 84;
    const ch = new Character(s, {
      size,
      mood: el.dataset.mood || 'awake',
      calm: 'calm' in el.dataset,
      sticker: el.dataset.sticker !== 'off' && size >= 36,
      ...options,
    });
    el.append(ch.el);
    el.jelly = ch;
    if (el.dataset.breathe !== 'off') ch.el.classList.add('breathe');
    ch.el.style.setProperty('--phase', `${-(hashSeed(s.seed) % 2300)}ms`);
    if ((el.dataset.mood || 'awake') === 'awake') ch.lively(true);
    return ch;
  }

  /** A random look for "Surprise me" (derive.ts surpriseLook), on the reroll seed's bodies. */
  function surprise() {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const look = {
      body: pick(['blob', 'gumdrop', 'drop', 'bean', 'mochi', 'capsule', 'onigiri', 'star', 'ghost']),
      eyes: pick(['dot', 'shiny', 'googly', 'sleepy', 'happy', 'cyclops', 'glasses', 'shades']),
      mouth: pick(['smile', 'grin', 'cat', 'o', 'blep', 'fang', 'buck', 'flat', 'wobbly']),
      topper: pick(['tuft', 'sprout', 'flower', 'antenna', 'horns', 'catEars', 'bearEars', 'bunnyEars', 'bow', 'crown', 'halo', 'beanie', 'partyHat', 'propeller', 'dogEars', 'chefHat', 'headphones', 'sweatband', 'gradCap']),
      neck: Math.random() < 0.45 ? pick(['bowtie', 'scarf', 'tie', 'collar', 'bib', 'medal']) : 'none',
      surface: pick(['plain', 'freckles', 'sprinkles', 'spots', 'stripes', 'sugar', 'belly', 'sparkle']),
      motion: pick(Object.keys(personalities)),
    };
    return { look, geo: `${look.body}:${DATA.rerollSeed}`, hue: pick(HUES.filter((h) => h !== 'gray')) };
  }

  window.Jelly = { Character, Value, T, S, W, C, ease, springs, tones, onFrame, kick, spec, mount, mouldSvg, surprise, reduceMotion, hashSeed, cast: DATA.cast };

  for (const el of document.querySelectorAll('[data-jelly]')) mount(el);

  /** A deep bow, eyes squeezed shut, like taking a curtain call. */
  function bow(ch) {
    if (reduceMotion.matches || performance.now() < ch.busyUntil) return;
    ch.busyUntil = performance.now() + 1300;
    const v = ch.v;
    v.plop.go(T(0.2, 280, ease.inOutSin), W(420), S(0, springs.wobble));
    v.tilt.go(T(-4, 280, ease.inOutSin), W(420), S(0, springs.soft));
    v.lookY.go(T(1, 260), W(440), T(0, 300));
    v.blink.go(T(0.25, 260), W(440), T(1, 220));
  }

  // The footer credit's jelly bows when the credits roll into view, and on a tap or hover.
  for (const credit of document.querySelectorAll('[data-bow]')) {
    const ch = credit.querySelector('[data-jelly]')?.jelly;
    if (!ch) continue;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        setTimeout(() => bow(ch), 300);
      }
    }, { threshold: 1 });
    io.observe(credit);
    credit.addEventListener('pointerenter', () => bow(ch));
    credit.addEventListener('click', () => bow(ch));
  }
})();
