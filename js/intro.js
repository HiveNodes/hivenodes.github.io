// The opening title, the way a studio opens a film: the mission's own frames flip past faster and faster, a flash,
// then the HiveNodes mark, then the film. About 2.6 s, once per visit, desktop-class screens only; skipped for reduced motion, data-saver, or if
// the frames are not already loaded within 1.2 s (a slow link sees the film at once instead of waiting).
export function intro() {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, save = navigator.connection && navigator.connection.saveData;
  let seen = false; try { seen = sessionStorage.getItem('hv-intro') === '1'; sessionStorage.setItem('hv-intro', '1'); } catch {}
  // desktop-class screens only: a phone, often on a slow link, goes straight to the film
  const big = matchMedia('(pointer: fine) and (min-width: 1000px)').matches;
  if (RM || save || seen || !big || navigator.webdriver) return;
  const F = ['c0073', 'c0217', 'c0325', 'c0505', 'c0640', 'c0775', 'c0865', 'c0880', 'c1009', 'c1090'].map(n => `media/cine/${n}_800.webp`);
  const el = document.createElement('div'); el.id = 'intro'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="iv"><canvas></canvas></div><div class="im"><img src="brand/logo-primary.svg" alt=""></div>';
  document.body.append(el); document.documentElement.classList.add('intro-on');
  const cvs = el.querySelector('.iv canvas'), cx = cvs.getContext('2d'), imgs = [], done = () => { el.classList.add('out'); document.documentElement.classList.remove('intro-on'); setTimeout(() => el.remove(), 900); };
  const load = Promise.all(F.map((s, k) => new Promise(r => { const i = new Image(); imgs[k] = i; i.onload = i.onerror = r; i.src = s; })));
  const timeout = new Promise(r => setTimeout(() => r('slow'), 1200));
  // frames are drawn on a canvas: a flip-book, not a page image
  const paint = (i, sc, sh) => { const W = cvs.width = innerWidth, H = cvs.height = innerHeight; if (!i || !i.naturalWidth) return;
    const s2 = Math.max(W / i.naturalWidth, H / i.naturalHeight) * sc, w = i.naturalWidth * s2, h = i.naturalHeight * s2; cx.drawImage(i, (W - w) / 2 + sh * W, (H - h) / 2, w, h); };
  Promise.race([load, timeout]).then(res => {
    if (res === 'slow') { done(); return; }
    let k = 0, d = 150; const flip = () => {
      paint(imgs[k % F.length], 1.25 - k * .012, (k % 2 ? -1 : 1) * .02); k++;
      if (k < 22) { d = Math.max(45, d * .86); setTimeout(flip, d); } else { el.classList.add('mark'); setTimeout(done, 1300); }
    }; flip();
  });
  el.addEventListener('click', done);
}
