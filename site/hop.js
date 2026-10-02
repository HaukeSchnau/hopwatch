// The landing page's demo: today's 24-hour dial with the running jelly in the middle and
// the cast below it. Tapping a jelly ends the running bean at now, starts a new one in the
// tapped jelly's color, and the jelly hops from its slot into the dial. The day before the
// visitor arrived is made up relative to their clock, so it looks lived-in at any hour.
// Without JavaScript the page shows the dial as a still picture.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;

  const MIN = 60e3;
  const HOUR = 60 * MIN;
  const CENTER = 200;
  const RADIUS = 158;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const beans = demo.querySelector('.beans');
  const stage = demo.querySelector('.center .jelly');
  const nameEl = demo.querySelector('.center .name');
  const timerEl = demo.querySelector('.timer');
  const sinceEl = demo.querySelector('.since');
  const status = demo.querySelector('[role="status"]');
  const hint = demo.querySelector('.hint');
  const buttons = [...demo.querySelectorAll('.cast button')];

  /** id → { button, color, name } from the markup, so the page stays the source of truth. */
  const cast = new Map(
    buttons.map((button) => {
      const svg = button.querySelector('.jelly');
      const name = button.querySelector('.label').textContent.trim();
      return [button.dataset.jelly, { button, svg, color: svg.style.getPropertyValue('--c').trim(), name }];
    }),
  );

  const now = Date.now();
  const entries = [
    { id: 'dog', start: now - 9.6 * HOUR, end: now - 9.05 * HOUR },
    { id: 'job', start: now - 8.8 * HOUR, end: now - 5.3 * HOUR },
    { id: 'cooking', start: now - 5.1 * HOUR, end: now - 4.45 * HOUR },
    { id: 'deep', start: now - 4.2 * HOUR, end: now - 0.95 * HOUR },
  ];
  let running = { id: buttons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.jelly ?? 'job', start: now - 47 * MIN - 12e3 };

  const clock = new Intl.DateTimeFormat(document.documentElement.lang, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /** Clock angle in radians for a timestamp: midnight at the bottom, noon at the top. */
  function angle(t) {
    const d = new Date(t);
    const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    return ((hours - 12) / 24) * 2 * Math.PI;
  }

  function point(a, r) {
    return `${(CENTER + r * Math.sin(a)).toFixed(2)} ${(CENTER - r * Math.cos(a)).toFixed(2)}`;
  }

  /** An SVG arc along the dial from `start` to `end`, clockwise. */
  function arc(start, end, r, trim = 0) {
    const a1 = angle(start) + trim;
    const span = Math.max(0, ((end - start) / (24 * HOUR)) * 2 * Math.PI - 2 * trim);
    if (span < 0.004) return `M${point(a1, r)}L${point(a1, r)}`;
    return `M${point(a1, r)}A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${point(a1 + span, r)}`;
  }

  function bean(entry, end) {
    const color = cast.get(entry.id).color;
    const gloss = end - entry.start > 25 * MIN ? `<path class="bean-gloss" d="${arc(entry.start, end, RADIUS - 4, 0.035)}"/>` : '';
    return `<path class="bean" stroke="${color}" d="${arc(entry.start, end, RADIUS)}"/>${gloss}`;
  }

  function drawDial() {
    const t = Date.now();
    const head = point(angle(t), RADIUS);
    const [hx, hy] = head.split(' ');
    beans.innerHTML =
      entries.map((e) => bean(e, e.end)).join('') +
      bean(running, t) +
      `<circle class="head" cx="${hx}" cy="${hy}" r="13" fill="${cast.get(running.id).color}"/>` +
      `<circle class="head-dot" cx="${hx}" cy="${hy}" r="3.2"/>`;
  }

  function drawTimer() {
    const s = Math.max(0, Math.floor((Date.now() - running.start) / 1000));
    const h = Math.floor(s / 3600);
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    timerEl.innerHTML = `${h}:${m}<small>:${String(s % 60).padStart(2, '0')}</small>`;
  }

  function drawCenter() {
    const jelly = cast.get(running.id);
    stage.innerHTML = jelly.svg.innerHTML;
    stage.style.setProperty('--c', jelly.color);
    nameEl.textContent = jelly.name;
    sinceEl.textContent = `${sinceEl.dataset.label} ${clock.format(running.start)}`;
    drawTimer();
  }

  function replay(el, className) {
    el.classList.remove(className);
    void el.getBoundingClientRect();
    el.classList.add(className);
  }

  function switchTo(id) {
    if (id === running.id) {
      if (!reduceMotion.matches) replay(stage, 'settle');
      return;
    }
    const t = Date.now();
    const previous = cast.get(running.id);
    const next = cast.get(id);
    entries.push({ id: running.id, start: running.start, end: t });
    running = { id, start: t };

    const from = next.svg.getBoundingClientRect();
    previous.button.setAttribute('aria-pressed', 'false');
    next.button.setAttribute('aria-pressed', 'true');
    drawCenter();
    drawDial();
    status.textContent = status.dataset.template.replace('{name}', next.name);

    if (reduceMotion.matches) return;
    // FLIP: start the stage jelly where the tapped one sat, then let it hop home.
    const to = stage.getBoundingClientRect();
    stage.style.setProperty('--dx', `${from.left + from.width / 2 - (to.left + to.width / 2)}px`);
    stage.style.setProperty('--dy', `${from.bottom - to.bottom}px`);
    stage.style.setProperty('--s', String(from.width / to.width));
    replay(stage, 'hop');
    replay(previous.svg, 'settle');
  }

  for (const button of buttons) button.addEventListener('click', () => switchTo(button.dataset.jelly));
  stage.addEventListener('animationend', () => stage.classList.remove('hop', 'settle'));
  for (const { svg } of cast.values()) svg.addEventListener('animationend', () => svg.classList.remove('settle'));

  hint.hidden = false;
  drawCenter();
  drawDial();
  setInterval(drawTimer, 1000);
  setInterval(drawDial, 20e3);
})();
