// The landing page's life. The hero is the app's Now screen in miniature: today's candy
// dial with the running jelly on stage and the others napping below. Tapping one plays
// the app's signature hop (src/jelly/now/choreo.ts, Flyer.tsx, Stage.tsx): it squishes
// under the finger, its eyes pop open and it hops along an arc onto the stage, stretching
// mid-air and landing with a squash that jiggles out, while the old one yawns and hops
// back into its slot. Further down, each feature has a jelly doing its thing, a jar fills
// to the brim with confetti, and a jelly peeks over the screenshots. Needs jelly.js.
(() => {
  'use strict';

  const J = window.Jelly;
  if (!J) return;
  const { T, S, W, C, ease, springs, reduceMotion } = J;
  const calm = () => reduceMotion.matches;
  const lang = document.documentElement.lang;
  const MIN = 60e3;
  const HOUR = 60 * MIN;

  /* ---------- Candy confetti, for moments that earned it ---------- */

  const CONFETTI = ['#FF6FB5', '#4B8BFF', '#FFC53D', '#34C97E', '#A36AFF', '#FF8A3D', '#3CC6F0', '#FF5C6C'];

  function confetti(x, y, count = 70) {
    if (calm()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const bits = Array.from({ length: count }, () => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = 420 + Math.random() * 520;
      return {
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        shape: Math.floor(Math.random() * 3),
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      };
    });
    const start = performance.now();
    let last = start;
    J.onFrame((now) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      const age = (now - start) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = Math.max(0, Math.min(1, (2.6 - age) / 0.6));
      for (const b of bits) {
        b.vy += 1300 * dt;
        b.vx *= 1 - 1.6 * dt;
        b.vy *= 1 - 0.9 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.r += b.vr * dt;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.r);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        if (b.shape === 0) ctx.arc(0, 0, b.h / 1.6, 0, Math.PI * 2);
        else if (b.shape === 1) ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, b.h / 2);
        else ctx.roundRect(-b.w * 0.7, -1.6, b.w * 1.4, 3.2, 1.6);
        ctx.fill();
        ctx.restore();
      }
      if (age > 2.6) {
        canvas.remove();
        return false;
      }
    });
  }

  /* ---------- The hero: dial, stage and cast ---------- */

  const demo = document.querySelector('[data-demo]');
  if (demo) hero(demo);

  function hero(demo) {
    const CENTER = 200;
    const RADIUS = 158;
    const beansEl = demo.querySelector('.beans');
    const liveLayer = demo.querySelector('.dial-live');
    const [flashEl, liveBean, liveGloss, headEl, headDot] = ['.flash', '.live-bean', '.live-gloss', '.head', '.head-dot'].map((q) => liveLayer.querySelector(q));
    const stageSlot = demo.querySelector('.stage-slot');
    const stageFloor = demo.querySelector('.stage-floor');
    const nameEl = demo.querySelector('.center .name');
    const timerEl = demo.querySelector('.timer');
    const sinceEl = demo.querySelector('.since');
    const status = demo.querySelector('[role="status"]');
    const hint = demo.querySelector('.hint');
    const clock = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

    // The cast, as the markup lists it: each tile holds a napping jelly and its dimple.
    const tiles = new Map();
    for (const button of demo.querySelectorAll('.cast button')) {
      const key = button.dataset.cast;
      const spec = J.spec(key);
      const slot = button.querySelector('.slot');
      const ch = new J.Character(spec, { size: slot.clientWidth || 84, mood: 'asleep' });
      ch.el.classList.add('breathe');
      ch.el.style.setProperty('--phase', `${-(J.hashSeed(spec.seed) % 2300)}ms`);
      slot.insertAdjacentHTML('beforeend', J.mouldSvg(spec));
      slot.style.setProperty('--c', J.tones[spec.hue].deep);
      slot.append(ch.el);
      tiles.set(key, { key, button, slot, ch, spec, name: button.querySelector('.label').textContent.trim() });
    }
    const firstRunning = [...tiles.values()].find((t) => t.button.getAttribute('aria-pressed') === 'true') ?? tiles.values().next().value;

    const stage = new J.Character(J.spec(firstRunning.key), { size: stageSlot.clientWidth || 110, mood: 'awake', shadow: false });
    stage.el.classList.add('breathe', 'breathe-stage');
    stageSlot.append(stage.el);
    stage.lively(true);

    /** Which tile shows its jelly and which its empty dimple. */
    function showTile(tile, away) {
      tile.slot.classList.toggle('is-away', away);
    }
    showTile(firstRunning, true);

    // The day so far, made up relative to the visitor's clock. Switching fast-forwards the
    // demo day a little, so the new bean visibly pours into the dial.
    const realNow = Date.now();
    const dayEnd = new Date(realNow).setHours(23, 59, 0, 0);
    const offset = new J.Value(0);
    /** Where the demo clock's offset is heading once every pour so far has landed. */
    let offsetTarget = 0;
    const demoNow = () => Date.now() + offset.v;
    const entries = [
      { key: 'dog', start: realNow - 9.6 * HOUR, end: realNow - 9.05 * HOUR },
      { key: 'job', start: realNow - 8.8 * HOUR, end: realNow - 5.3 * HOUR },
      { key: 'cooking', start: realNow - 5.1 * HOUR, end: realNow - 4.45 * HOUR },
      { key: 'deep', start: realNow - 4.2 * HOUR, end: realNow - 0.95 * HOUR },
    ].filter((e) => tiles.has(e.key));
    let running = { key: firstRunning.key, start: realNow - 47 * MIN - 12e3 };
    const ignite = new J.Value(1);
    /** How far the demo day fast-forwards per switch, so the new bean pours in visibly. */
    const POUR = 40 * MIN;
    let dayFull = false;

    const color = (key) => J.tones[tiles.get(key).spec.hue].fill;

    /** Clock angle for a timestamp: midnight at the bottom, noon at the top. */
    function angle(t) {
      const d = new Date(t);
      return ((d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 - 12) / 24) * 2 * Math.PI;
    }
    const point = (a, r) => `${(CENTER + r * Math.sin(a)).toFixed(2)} ${(CENTER - r * Math.cos(a)).toFixed(2)}`;
    function arc(start, end, r, trim = 0) {
      const a1 = angle(start) + trim;
      const span = Math.max(0, ((end - start) / (24 * HOUR)) * 2 * Math.PI - 2 * trim);
      if (span < 0.004) return `M${point(a1, r)}L${point(a1, r)}`;
      return `M${point(a1, r)}A${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${point(a1 + span, r)}`;
    }
    function bean(e, end) {
      const gloss = end - e.start > 25 * MIN ? `<path class="bean-gloss" d="${arc(e.start, end, RADIUS - 4, 0.035)}"/>` : '';
      return `<path class="bean" stroke="${color(e.key)}" d="${arc(e.start, end, RADIUS)}"/>${gloss}`;
    }

    /** The finished beans: redrawn only when the running entry changes. */
    function drawPast() {
      beansEl.innerHTML = entries.map((e) => bean(e, e.end)).join('');
    }

    /** The running bean, its glowing head and the ring flash, on their own layer. */
    function drawDial() {
      const t = demoNow();
      const [hx, hy] = point(angle(t), RADIUS).split(' ');
      const g = ignite.v;
      const c = color(running.key);
      liveBean.setAttribute('d', arc(running.start, t, RADIUS));
      liveBean.setAttribute('stroke', c);
      liveGloss.setAttribute('d', t - running.start > 25 * MIN ? arc(running.start, t, RADIUS - 4, 0.035) : '');
      liveLayer.style.setProperty('--head', c);
      const glow = g >= 1 ? 20 : 20 + Math.sin(Math.min(1, g * 1.3) * Math.PI) * 18;
      for (const el of [headEl, headDot]) {
        el.setAttribute('cx', hx);
        el.setAttribute('cy', hy);
      }
      headEl.setAttribute('r', glow.toFixed(1));
      headDot.setAttribute('r', '3.2');
      flashEl.setAttribute('stroke', c);
      flashEl.setAttribute('opacity', g >= 1 ? 0 : (Math.sin(Math.min(1, g * 1.6) * Math.PI) * 0.3).toFixed(3));
    }

    let lastTimer = '';
    function drawTimer() {
      const s = Math.max(0, Math.floor((demoNow() - running.start) / 1000));
      const text = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}<small>:${String(s % 60).padStart(2, '0')}</small>`;
      if (text !== lastTimer) {
        timerEl.innerHTML = text;
        lastTimer = text;
      }
    }

    /** A little jelly bounce for a label that just changed. */
    function boing(el) {
      if (calm()) return;
      el.classList.remove('boing');
      void el.offsetWidth;
      el.classList.add('boing');
    }

    function drawReadout(bounce) {
      nameEl.textContent = tiles.get(running.key).name;
      sinceEl.textContent = `${sinceEl.dataset.label} ${clock.format(running.start)}`;
      drawTimer();
      if (bounce) {
        boing(nameEl);
        boing(timerEl);
      }
      live?.update(bounce);
    }

    /** Lights the new running bean up as its jelly lands: a ring flash and the pour. */
    function lightUp() {
      if (calm()) return drawDial();
      ignite.set(0);
      ignite.go(T(1, 950, ease.outCubic));
      if (offsetTarget !== offset.v) offset.go(T(offsetTarget, 900, ease.outCubic));
      J.onFrame(() => {
        drawDial();
        drawTimer();
        live?.update(false);
        return ignite.busy || offset.busy;
      });
      if (!dayFull && Date.now() + offsetTarget >= dayEnd - MIN) {
        // Someone tapped their way through the whole day.
        dayFull = true;
        const r = demo.querySelector('.dial').getBoundingClientRect();
        setTimeout(() => confetti(r.left + r.width / 2, r.top + r.height / 2, 110), 700);
      }
    }

    /* Flights between a tile and the stage, as in Flyer.tsx. */

    const layer = document.createElement('div');
    layer.className = 'flyer-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    const flights = new Set();

    function fly({ from, toEl, source, kind, onLand }) {
      const fromRect = from.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      const size = Math.max(fromRect.width, toRect.width);
      const ch = new J.Character(source.spec, { size, mood: 'awake', shadow: false });
      for (const k of ['awake', 'blink', 'lookX', 'lookY', 'yawn']) ch.v[k].set(source.v[k].v);
      ch.el.classList.add('flyer');
      layer.append(ch.el);
      const progress = new J.Value(0);
      const flight = { ch, progress, fromRect, toEl, toRect, scrolled: scrollY, kind, onLand, size, done: false };
      flights.add(flight);
      if (kind === 'in') {
        // Launch: from the squish under the finger straight into a stretch.
        ch.v.plop.set(Math.max(0.16, source.v.plop.v));
        ch.v.plop.go(S(-0.06, { damping: 10, stiffness: 300, mass: 0.6 }), S(0, springs.soft));
        ch.wake();
      } else {
        ch.sleep();
      }
      progress.go(T(1, kind === 'in' ? 540 : 620, ease.flight), C(() => land(flight)));
      J.onFrame(() => {
        if (flight.done) return false;
        place(flight);
      });
      place(flight);
    }

    function place(f) {
      const t = f.progress.v;
      if (f.scrolled !== scrollY) {
        // The page moved under the flight: follow both ends.
        const dy = f.scrolled - scrollY;
        f.fromRect = new DOMRect(f.fromRect.x, f.fromRect.y + dy, f.fromRect.width, f.fromRect.height);
        f.toRect = f.toEl.getBoundingClientRect();
        f.scrolled = scrollY;
      }
      const to = f.toRect;
      const from = f.fromRect;
      const fx = from.left + from.width / 2;
      const fy = from.top + from.height / 2;
      const tx = to.left + to.width / 2;
      const ty = to.top + to.height / 2;
      const lift = (f.kind === 'in' ? 110 : 70) + Math.hypot(tx - fx, ty - fy) * 0.12;
      const x = fx + (tx - fx) * t;
      const y = fy + (ty - fy) * t - lift * 4 * t * (1 - t);
      const width = from.width + (to.width - from.width) * t;
      const stretch = Math.sin(Math.PI * t) * 0.18;
      const spin = (f.kind === 'in' ? -1 : 1) * 16 * Math.sin(Math.PI * t);
      f.ch.el.style.transform = `translate(${(x - f.size / 2).toFixed(1)}px,${(y - f.size / 2).toFixed(1)}px) scale(${(width / f.size).toFixed(4)}) rotate(${spin.toFixed(2)}deg) scale(${(1 - stretch * 0.55).toFixed(4)},${(1 + stretch).toFixed(4)})`;
    }

    function land(f) {
      if (f.done) return;
      f.done = true;
      flights.delete(f);
      f.progress.set(1);
      f.onLand(f.ch);
      // The flyer lingers one frame on top while the landed jelly draws below.
      requestAnimationFrame(() => f.ch.el.remove());
    }

    /** A little burst of candy where a jelly lands. */
    function splash(el, hue, count) {
      if (calm()) return;
      const r = el.getBoundingClientRect();
      const t = J.tones[hue];
      const colors = [t.fill, t.light, '#FFFFFF', t.fill];
      for (let i = 0; i < count; i++) {
        const a = Math.PI * (1.08 + (0.84 * i) / Math.max(1, count - 1)) + (Math.random() - 0.5) * 0.25;
        const d = r.width * (0.38 + Math.random() * 0.22);
        const dot = document.createElement('span');
        dot.className = 'splash';
        dot.style.cssText = `left:${(r.left + r.width / 2 + Math.cos(a) * r.width * 0.3).toFixed(1)}px;top:${(r.top + r.height * 0.86).toFixed(1)}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d * 0.7).toFixed(1)}px;--s:${(4 + Math.random() * 5).toFixed(1)}px;--c:${colors[i % colors.length]}`;
        layer.append(dot);
        dot.addEventListener('animationend', () => dot.remove());
      }
    }

    /** A newer switch wins: whatever is still in the air lands at once. */
    const finishFlights = () => [...flights].forEach(land);

    /** The jelly on stage after a tap that doesn't switch: a happy bounce. */
    function cheer() {
      if (calm()) return;
      stage.land(0.18);
      stage.v.hop.go(W(60), T(0.7, 200, ease.outQuad), T(0, 190, ease.inQuad));
      if (performance.now() > stage.busyUntil) stage.perform();
    }

    function switchTo(key) {
      if (key === running.key) return cheer();
      interacted();
      finishFlights();
      const prev = tiles.get(running.key);
      const next = tiles.get(key);
      // The switch happens at the end of the previous pour; this one pours in when it lands.
      const t = Date.now() + offsetTarget;
      entries.push({ key: running.key, start: running.start, end: t });
      running = { key, start: t };
      if (!calm()) offsetTarget += Math.max(0, Math.min(POUR, dayEnd - t));
      prev.button.setAttribute('aria-pressed', 'false');
      next.button.setAttribute('aria-pressed', 'true');
      status.textContent = status.dataset.template.replace('{name}', next.name);
      drawReadout(true);
      drawPast();
      drawDial();

      if (calm()) {
        stage.setSpec(next.spec);
        showTile(prev, false);
        showTile(next, true);
        return;
      }

      // Out: the old one yawns and hops back into its dimple.
      stage.el.classList.add('is-away');
      stageFloor.classList.add('is-away');
      fly({
        from: stageSlot,
        toEl: prev.slot,
        source: stage,
        kind: 'out',
        onLand() {
          for (const k of ['awake', 'yawn', 'lookX', 'lookY']) prev.ch.v[k].set(0);
          prev.ch.v.blink.set(1);
          showTile(prev, false);
          prev.ch.land(0.22);
          splash(prev.slot, prev.spec.hue, 4);
        },
      });

      // In: the tapped one launches from its slot onto the stage.
      const source = next.ch;
      fly({
        from: next.slot,
        toEl: stageSlot,
        source,
        kind: 'in',
        onLand(flyer) {
          stage.setSpec(next.spec);
          for (const k of ['awake', 'blink', 'lookX', 'lookY', 'yawn']) stage.v[k].set(flyer.v[k].v);
          stage.el.classList.remove('is-away');
          stageFloor.classList.remove('is-away');
          stage.v.plop.set(0);
          stage.land(0.26);
          const fromLeft = next.slot.getBoundingClientRect().left < stageSlot.getBoundingClientRect().left;
          stage.v.tilt.go(T(fromLeft ? 7 : -7, 70), S(0, springs.wobble));
          stage.wake();
          stage.busyUntil = performance.now() + 900;
          navigator.vibrate?.(8);
          splash(stageSlot, next.spec.hue, 8);
          lightUp();
        },
      });
      showTile(next, true);
      // Its napping self in the slot goes back to sleep for when it returns.
      for (const k of ['awake', 'plop']) source.v[k].set(0);
    }

    // Tiles: squish under the finger, eyes pop open, the hop on release.
    for (const tile of tiles.values()) {
      const { button, ch } = tile;
      let sleepTimer = 0;
      const doze = (ms) => {
        clearTimeout(sleepTimer);
        sleepTimer = setTimeout(() => {
          if (running.key !== tile.key && !ch.follow) ch.sleep();
        }, ms);
      };
      button.addEventListener('pointerdown', (e) => {
        if (running.key === tile.key) return;
        clearTimeout(sleepTimer);
        ch.press(true);
        ch.wake();
        ch.lookAt(e.clientX, e.clientY, 600);
      });
      const release = () => {
        ch.press(false);
        doze(350);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || running.key === tile.key) return;
        clearTimeout(sleepTimer);
        ch.follow = true;
        ch.wake();
        ch.lookAt(e.clientX, e.clientY);
      });
      button.addEventListener('pointerleave', (e) => {
        ch.follow = false;
        if (e.pointerType === 'mouse') ch.press(false);
        if (running.key !== tile.key) doze(250);
      });
      button.addEventListener('click', () => {
        clearTimeout(sleepTimer);
        if (running.key === tile.key) {
          // Its dimple: the jelly on stage wiggles hello.
          if (!calm()) stage.v.tilt.go(T(-7, 60), T(6, 80), S(0, springs.wobble));
          return;
        }
        ch.follow = false;
        if (ch.v.plop.v < 0.05 && !calm()) ch.v.plop.set(0.18);
        switchTo(tile.key);
      });
    }

    stageSlot.addEventListener('click', cheer);

    // The stage jelly does a happy little hop now and then (Stage.tsx).
    (function happyHop() {
      setTimeout(() => {
        if (!calm() && stage.visible && !flights.size && performance.now() > stage.busyUntil && !document.hidden) {
          stage.v.hop.go(T(0.55, 200, ease.outQuad), T(0, 190, ease.inQuad));
          stage.v.plop.go(W(390), T(0.14, 60), S(0, springs.wobble));
        }
        happyHop();
      }, 6000 + Math.random() * 6000);
    })();

    // Until someone taps, a napping jelly stirs now and then as an invitation.
    let invited = false;
    let inviteTimer = 0;
    function interacted() {
      invited = true;
      clearTimeout(inviteTimer);
      hint.classList.add('is-done');
    }
    (function invite() {
      inviteTimer = setTimeout(() => {
        if (invited) return;
        const napping = [...tiles.values()].filter((t) => t.key !== running.key);
        const tile = napping[Math.floor(Math.random() * napping.length)];
        if (!calm() && tile && stage.visible && !document.hidden) {
          tile.ch.v.hop.go(T(0.4, 180, ease.outQuad), T(0, 170, ease.inQuad));
          tile.ch.v.plop.go(W(350), T(0.16, 60), S(0, springs.wobble));
          tile.ch.v.awake.go(T(0.7, 120), W(500), T(0, 300));
        }
        invite();
      }, 4500 + Math.random() * 3500);
    })();

    // Characters keep their pixel size; rebuild them when the layout changes size.
    let resizeTimer = 0;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const s = stageSlot.clientWidth;
        if (s && Math.abs(s - stage.size) > 8) {
          stage.size = s;
          stage.build();
        }
        for (const t of tiles.values()) {
          const w = t.slot.clientWidth;
          if (w && Math.abs(w - t.ch.size) > 8) {
            t.ch.size = w;
            t.ch.build();
          }
        }
      }, 200);
    });

    /* The Lock Screen card in the features mirrors the running jelly. */
    const liveEl = document.querySelector('[data-live]');
    const live = liveEl && liveCard(liveEl);

    function liveCard(el) {
      const slot = el.querySelector('.live-jelly');
      const ch = new J.Character(J.spec(running.key), { size: 44, mood: 'awake', shadow: false, sticker: false });
      slot.append(ch.el);
      ch.lively(true);
      const name = el.querySelector('.live-name');
      const since = el.querySelector('.live-since');
      const timer = el.querySelector('.live-timer');
      const back = el.querySelector('.live-back');
      let shown = null;
      let last = '';
      let previous = null;
      return {
        update(changed) {
          if (shown !== running.key) {
            previous = shown;
            shown = running.key;
            ch.setSpec(J.spec(running.key));
            if (changed && !calm()) {
              ch.land(0.24);
              ch.wake();
            }
          }
          name.textContent = tiles.get(running.key).name;
          since.textContent = `${sinceEl.dataset.label} ${clock.format(running.start)}`;
          const backKey = previous ?? entries[entries.length - 1]?.key;
          if (backKey && back) back.textContent = back.dataset.template.replace('{name}', tiles.get(backKey).name);
          const s = Math.max(0, Math.floor((demoNow() - running.start) / 1000));
          const text = `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
          if (text !== last) {
            timer.textContent = text;
            last = text;
          }
        },
      };
    }

    hint.hidden = false;
    drawReadout(false);
    drawPast();
    drawDial();
    setInterval(() => {
      drawTimer();
      live?.update(false);
    }, 1000);
    setInterval(drawDial, 20e3);
  }

  /* ---------- Features: one jelly each, doing its thing ---------- */

  const feature = (name) => document.querySelector(`[data-feature="${name}"]`);
  const jellyIn = (el) => el?.querySelector('[data-jelly]')?.jelly;
  const onTap = (el, fn) => el?.addEventListener('click', fn);

  /** Calls `fn` once when `el` is mostly on screen. */
  function whenSeen(el, fn, threshold = 0.6) {
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fn();
        }
      },
      { threshold },
    );
    io.observe(el);
  }

  // One tap to switch: it hops when you tap it.
  {
    const el = feature('switch');
    const ch = jellyIn(el);
    onTap(el?.querySelector('.feat-jelly'), () => {
      if (!ch || calm()) return;
      ch.land(0.2);
      ch.busyUntil = performance.now() + 1500;
      ch.v.hop.go(W(60), T(1, 210, ease.outQuad), T(0, 190, ease.inQuad), W(80), T(0.6, 170, ease.outQuad), T(0, 160, ease.inQuad));
      ch.v.plop.go(W(460), T(0.2, 60), S(0, springs.wobble), W(150), T(0.16, 60), S(0, springs.wobble));
    });
  }

  // Your day on a dial: a little ring spins through a day around the one-eyed timer.
  {
    const el = feature('dial');
    const ch = jellyIn(el);
    const ring = el?.querySelector('.mini-dial');
    onTap(el?.querySelector('.feat-jelly'), () => {
      if (!ring || calm()) return;
      ring.classList.remove('is-spinning');
      void ring.getBoundingClientRect();
      ring.classList.add('is-spinning');
      ch?.perform();
    });
  }

  // Weeks and targets: the jar fills to the brim, then confetti.
  {
    const el = feature('targets');
    const jar = el?.querySelector('[data-jar]');
    if (jar) targetJar(el, jar, jellyIn(el));
  }

  function targetJar(el, jar, ch) {
    const fill = jar.querySelector('.jar-fill');
    const surface = jar.querySelector('.jar-surface');
    const label = jar.querySelector('.jar-label');
    const star = jar.querySelector('.jar-star');
    const TOP = 30;
    const BOTTOM = 118;
    const TARGET = 3 * 60;
    const level = new J.Value(0.55, draw);
    const wave = new J.Value(0, draw);
    let celebrated = false;
    const minutes = () => Math.round(level.v * TARGET * 1.07);
    function draw() {
      const y = BOTTOM - (BOTTOM - TOP) * Math.min(1, level.v);
      const a = wave.v * 5;
      fill.setAttribute('y', y.toFixed(1));
      surface.setAttribute('d', `M 18 ${y.toFixed(1)} Q 40 ${(y - a).toFixed(1)} 60 ${y.toFixed(1)} T 102 ${y.toFixed(1)}`);
      const m = minutes();
      label.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} / 3:00`;
      if (m >= TARGET) star.textContent = `★ +0:${String(m - TARGET).padStart(2, '0')}`;
      if (!celebrated && m >= TARGET) {
        celebrated = true;
        star.classList.add('is-on');
        const r = jar.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height * 0.2);
        if (ch && !calm()) {
          ch.land(0.2);
          ch.perform();
        }
      }
    }
    function pour() {
      celebrated = false;
      star.classList.remove('is-on');
      if (calm()) {
        level.set(1);
        return;
      }
      level.set(0.55);
      level.go(W(250), T(1, 1500, ease.outCubic));
      wave.go(T(1, 300), S(0, springs.wobble));
    }
    draw();
    whenSeen(jar, pour, 0.7);
    onTap(jar, pour);
    onTap(el.querySelector('.feat-jelly'), pour);
  }

  // Every jelly is someone: Surprise me rerolls the look, the new hat drops in.
  {
    const el = feature('someone');
    const ch = jellyIn(el);
    const glyphs = ['🚀', '🎸', '🧶', '🪴', '🎨', '🧁', '📚', '🛹', '🧩', '🍕', '🎮', '🐈'];
    let i = 0;
    const reroll = () => {
      if (!ch) return;
      const s = J.surprise();
      ch.setSpec({ ...ch.spec, ...s, glyph: glyphs[++i % glyphs.length] });
      if (calm()) return;
      ch.dressUp();
      ch.land(0.22);
      ch.v.tilt.go(T(-6, 70), S(0, springs.wobble));
      ch.busyUntil = performance.now() + 900;
    };
    onTap(el?.querySelector('.feat-jelly'), reroll);
    onTap(el?.querySelector('.surprise'), reroll);
  }

  // Stays on your phone: the ghost turns see-through, all but its eyes.
  {
    const el = feature('private');
    const ch = jellyIn(el);
    onTap(el?.querySelector('.feat-jelly'), () => {
      if (!ch || calm()) return;
      ch.v.fade.go(T(0.12, 260, ease.outCubic), W(1100), S(1, springs.soft));
      ch.el.classList.add('is-boo');
      setTimeout(() => ch.el.classList.remove('is-boo'), 1500);
      ch.v.lookX.go(T(-0.8, 200), W(400), T(0.8, 300), W(300), S(0, springs.soft));
    });
  }

  // Apple Intelligence: a plain jelly gets its emoji, color and look suggested.
  {
    const el = feature('ai');
    const ch = jellyIn(el);
    const chip = el?.querySelector('.suggested');
    if (ch) {
      const dressed = ch.spec;
      const plain = { ...dressed, hue: 'gray', glyph: null, look: { ...dressed.look, topper: 'none', eyes: 'dot', mouth: 'smile', surface: 'plain' } };
      ch.setSpec(plain);
      let busy = false;
      const suggest = () => {
        if (busy) return;
        busy = true;
        chip?.classList.remove('is-on');
        if (ch.spec.hue !== 'gray') ch.setSpec(plain);
        const think = calm() ? 0 : 900;
        if (think) {
          ch.v.lookY.go(T(-0.8, 250), W(500), T(0, 200));
          ch.v.lookX.go(T(0.5, 250), W(500), T(0, 200));
          el.classList.add('is-thinking');
        }
        setTimeout(() => {
          el.classList.remove('is-thinking');
          ch.setSpec(dressed);
          chip?.classList.add('is-on');
          busy = false;
          if (calm()) return;
          ch.dressUp();
          ch.land(0.24);
          ch.wake();
          ch.busyUntil = performance.now() + 900;
        }, think);
      };
      whenSeen(el, suggest, 0.8);
      onTap(el.querySelector('.feat-jelly'), suggest);
    }
  }

  // English and German: two jellies chatting; tap to swap languages.
  {
    const el = feature('languages');
    const bubbles = el ? [...el.querySelectorAll('.bubble')] : [];
    const pair = el ? [...el.querySelectorAll('[data-jelly]')].map((s) => s.jelly) : [];
    onTap(el?.querySelector('.chat'), () => {
      if (bubbles.length !== 2) return;
      const [a, b] = bubbles.map((x) => x.textContent);
      bubbles[0].textContent = b;
      bubbles[1].textContent = a;
      for (const x of bubbles) {
        x.classList.remove('boing');
        void x.offsetWidth;
        x.classList.add('boing');
      }
      if (!calm()) pair.forEach((ch, i) => ch && setTimeout(() => ch.land(0.2), i * 120));
    });
  }

  /* ---------- A jelly peeking over the screenshots ---------- */

  {
    const peek = document.querySelector('[data-peek]');
    const ch = peek?.querySelector('[data-jelly]')?.jelly;
    if (peek && ch) {
      const rise = new J.Value(0, () => peek.style.setProperty('--rise', rise.v.toFixed(3)));
      let hiding = false;
      const show = () => {
        if (calm()) return rise.set(1);
        rise.go(S(1, { damping: 9, stiffness: 170 }));
        ch.v.tilt.go(W(250), S(-9, springs.soft));
      };
      whenSeen(peek.parentElement, () => setTimeout(show, 400), 0.5);
      peek.addEventListener('click', () => {
        if (hiding) return;
        hiding = true;
        ch.wake();
        rise.go(T(1.12, 90, ease.outQuad), T(0, 200, ease.inQuad), W(2600), S(1, { damping: 9, stiffness: 170 }), C(() => (hiding = false)));
        ch.v.tilt.go(T(6, 90), W(2700), S(-9, springs.soft));
      });
    }
  }

  /* ---------- Sections pop in with a squish ---------- */

  if (!calm() && 'IntersectionObserver' in window) {
    const items = document.querySelectorAll('.pop');
    document.documentElement.classList.add('will-pop');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          const siblings = [...e.target.parentElement.children].filter((x) => x.classList.contains('pop'));
          e.target.style.setProperty('--delay', `${Math.max(0, siblings.indexOf(e.target)) * 70}ms`);
          e.target.classList.add('is-in');
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
    );
    items.forEach((el) => io.observe(el));
  }
})();
