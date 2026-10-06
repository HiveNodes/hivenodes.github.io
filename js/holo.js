// Holographic touch: panels tilt toward the pointer like a projected display, and a HUD ring trails the pointer and
// locks onto anything clickable. Fine pointers only; nothing for touch or reduced motion.
export function holo() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;
  for (const p of document.querySelectorAll('.ph, .fx')) {
    p.addEventListener('pointermove', e => { const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      p.style.transform = `perspective(1100px) rotateY(${x * 7}deg) rotateX(${-y * 6}deg) translateZ(0)`; p.style.setProperty('--gx', `${(x + .5) * 100}%`); p.style.setProperty('--gy', `${(y + .5) * 100}%`); });
    p.addEventListener('pointerleave', () => { p.style.transform = ''; });
  }
  const c = document.createElement('div'); c.id = 'hud'; c.setAttribute('aria-hidden', 'true'); document.body.append(c);
  let x = -100, y = -100, tx = x, ty = y, on = false;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!on) { on = true; x = tx; y = ty; c.classList.add('on'); }
    c.classList.toggle('lock', !!e.target.closest('a,button')); c.classList.toggle('film', !!e.target.closest('#film')); }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; c.classList.remove('on'); });
  const tick = () => { x += (tx - x) * .22; y += (ty - y) * .22; c.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(tick); }; tick();
}
