// HiveNodes homepage: the formation morph. Eight aircraft, top view, morphing between the shapes
// Scattrnodes flies (ADR-070 ghost-leader ring, ADR-074 close formation). Every aircraft steers to its own
// slot with a turn-rate and speed limit, so the change of shape looks like flight, not a tween.
// Draws only inside its own canvas; labels are HTML below it. Reduced motion: slots shown at once, no cycling.
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const N = 8;

// slot patterns in a unit frame (x right, y down), centred on the ghost leader
const SHAPES = {
  ring: k => { const a = -Math.PI / 2 + k * 2 * Math.PI / N; return [Math.cos(a) * .36, Math.sin(a) * .36]; },
  line: k => [(k - (N - 1) / 2) * .11, 0],
  tight: k => { const a = -Math.PI / 2 + k * 2 * Math.PI / N; return [Math.cos(a) * .17, Math.sin(a) * .17]; },
};

export function startFormations(root) {
  const cv = root.querySelector('canvas'), tabs = [...root.querySelectorAll('button[data-shape]')];
  if (!cv || !tabs.length) return;
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, S = 1, dpr = 1;
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect();
    W = r.width; H = r.height; S = Math.min(H, W / 1.25);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit(); addEventListener('resize', fit);

  // aircraft state in unit frame; start on the ring
  const ac = Array.from({ length: N }, (_, k) => { const [x, y] = SHAPES.ring(k); return { x, y, h: Math.atan2(y, x) + Math.PI / 2, trail: [] }; });
  let shape = 'ring', idx = 0, t0 = performance.now(), last = t0, running = false, userPicked = false;

  const select = (i, byUser) => {
    idx = i; shape = tabs[i].dataset.shape; t0 = performance.now();
    if (byUser) userPicked = true;
    tabs.forEach((t, j) => t.setAttribute('aria-pressed', String(j === i)));
    if (RM) { ac.forEach((a, k) => { [a.x, a.y] = SHAPES[shape](k); a.trail.length = 0; }); draw(performance.now()); }
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i, true)));

  const draw = now => {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    // ground grid, 1 cell ~ 20 m at the line-abreast spacing
    ctx.strokeStyle = 'rgba(233,229,220,.06)'; ctx.lineWidth = 1; ctx.beginPath();
    const g = S * .055;
    for (let x = cx % g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = cy % g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    // ghost leader: a point no aircraft owns
    const pulse = RM ? .5 : .5 + .5 * Math.sin(now / 420);
    ctx.strokeStyle = `rgba(196,165,116,${.35 + .4 * pulse})`; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, 9 + 3 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#c4a574'; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
    // slot markers
    ctx.strokeStyle = 'rgba(233,229,220,.28)';
    for (let k = 0; k < N; k++) { const [sx, sy] = SHAPES[shape](k); ctx.strokeRect(cx + sx * S - 4, cy + sy * S - 4, 8, 8); }
    // trails then aircraft
    for (const a of ac) {
      for (let i = 1; i < a.trail.length; i++) {
        const p = a.trail[i - 1], q = a.trail[i];
        ctx.strokeStyle = `rgba(255,70,50,${(i / a.trail.length) * .45})`; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx + p[0] * S, cy + p[1] * S); ctx.lineTo(cx + q[0] * S, cy + q[1] * S); ctx.stroke();
      }
    }
    for (const a of ac) {
      ctx.save(); ctx.translate(cx + a.x * S, cy + a.y * S); ctx.rotate(a.h); ctx.scale(1.45, 1.45);
      ctx.fillStyle = '#e9e5dc'; ctx.beginPath();
      // fixed-wing silhouette: fuselage, wing, tail
      ctx.moveTo(0, -9); ctx.lineTo(1.6, -2); ctx.lineTo(10, 1.5); ctx.lineTo(10, 3.2); ctx.lineTo(1.4, 2.2); ctx.lineTo(1, 6.5);
      ctx.lineTo(4, 8.4); ctx.lineTo(4, 9.6); ctx.lineTo(0, 8.8); ctx.lineTo(-4, 9.6); ctx.lineTo(-4, 8.4); ctx.lineTo(-1, 6.5);
      ctx.lineTo(-1.4, 2.2); ctx.lineTo(-10, 3.2); ctx.lineTo(-10, 1.5); ctx.lineTo(-1.6, -2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  // each aircraft flies to its slot: bounded turn rate, speed proportional to distance, never stops dead
  // (fixed-wing), so near the slot it orbits gently around it instead of hovering.
  const step = (now) => {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!userPicked && now - t0 > 5200) select((idx + 1) % tabs.length, false);
    const orbit = now / 1000;
    for (let k = 0; k < N; k++) {
      const a = ac[k], [sx, sy] = SHAPES[shape](k);
      // the slot itself drifts on a small loiter circle, so arrived aircraft keep flying
      const tx = sx + Math.cos(orbit * .9 + k) * .012, ty = sy + Math.sin(orbit * .9 + k) * .012;
      const dx = tx - a.x, dy = ty - a.y, dist = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx) + Math.PI / 2;
      let dh = ((want - a.h + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      const rate = 3.2; a.h += Math.max(-rate * dt, Math.min(rate * dt, dh));
      const v = Math.min(.05 + dist * 1.6, .32);
      a.x += Math.sin(a.h) * v * dt; a.y -= Math.cos(a.h) * v * dt;
      a.trail.push([a.x, a.y]); if (a.trail.length > 46) a.trail.shift();
    }
    draw(now);
    if (running) requestAnimationFrame(step);
  };

  const go = on => {
    if (RM) { draw(performance.now()); return; }
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(step); }
    else if (!on) running = false;
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => go(es.some(e => e.isIntersecting))).observe(cv);
  else go(true);
  addEventListener('resize', () => { if (!running) draw(performance.now()); });
  select(0, false); draw(performance.now());
}
