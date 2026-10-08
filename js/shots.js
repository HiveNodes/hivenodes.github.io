// System cards and the live teaser: each slot names a shot in media/manifest.json. Delivered shots play as muted loops
// (only while on screen); pending shots show a cinematic slate with the shot's slug line, never a stand-in render.
export async function startShots({ RM }) {
  let man = {}; try { man = await (await fetch('media/manifest.json')).json(); } catch {}
  const av1 = document.createElement('video').canPlayType('video/mp4; codecs="av01.0.08M.10"');
  for (const el of document.querySelectorAll('[data-shot]')) {
    const id = el.dataset.shot, s = man[id] || { slug: id };
    if (s.ready) {
      const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      v.poster = `media/cine/${id}_800.webp`; v.src = `media/cine/${id}${av1 ? '-av1' : ''}.mp4`; v.setAttribute('aria-hidden', 'true');
      v.addEventListener('error', () => { if (/-av1\.mp4$/.test(v.src)) v.src = v.src.replace(/-av1\.mp4$/, '.mp4'); });
      el.append(v);
      if (!RM) new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: .3 }).observe(v);
    } else {
      const d = document.createElement('div'); d.className = 'slate';
      const k = document.createElement('span'); k.textContent = 'Footage pending'; const t = document.createElement('p'); t.textContent = s.slug;
      d.append(k, t); el.append(d);
    }
  }
}
