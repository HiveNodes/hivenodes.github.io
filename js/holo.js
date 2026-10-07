// Pictures and the formation table tilt slightly (2 degrees) toward the pointer. Fine pointers only; nothing for touch or reduced motion.
export function holo() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;
  for (const p of document.querySelectorAll('.ph, .fx')) {
    p.addEventListener('pointermove', e => { const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      p.style.transform = `perspective(1100px) rotateY(${x * 2}deg) rotateX(${-y * 2}deg) translateZ(0)`; p.style.setProperty('--gx', `${(x + .5) * 100}%`); p.style.setProperty('--gy', `${(y + .5) * 100}%`); });
    p.addEventListener('pointerleave', () => { p.style.transform = ''; });
  }
}
