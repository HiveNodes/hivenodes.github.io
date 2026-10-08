// HiveNodes scroll cinema. One WebGL2 canvas draws whatever the current chapter's shot is -- a real video once its file
// is delivered (media/manifest.json says "ready"), or a cinematic slate (grain, slug line) until then -- through one
// film pipeline: 2.39:1 letterbox, shadow-weighted grain, edge chromatic aberration, anamorphic streak + bloom on
// highlights, vignette, one grade (cool shadows, muted warm highlights, blacks near #0b0e11), lens dirt on bright frames.
// Scrolling the pinned #mission section moves between chapters through a short dip to dark; inside a chapter the shot
// plays in real time, so the film never stops while you read. The canvas redraws only when a new video frame arrives
// (24 fps cadence), or at 24 fps for slates. Words stay in the panel beside the picture; the fleet radio and the
// operator's tasking console live there too.
const $ = (s, r = document) => r.querySelector(s);

// ---- the operator's input, and the fleet radio per chapter (lines are offsets in seconds after the chapter starts)
const task = { ll: '33.9178 N, 78.5126 E', type: 'Surveillance' };
const tgt = () => task.type !== 'Surveillance';
const RADIO = () => ({
  1: [[0.6, 'UAV', 'All', 'Formed up. One plan, every vehicle.']],
  2: [[0.4, 'UAV', 'UGV', 'Over the lake. Ground team, we have your route.'], [2.4, 'USV', 'UAV', 'USVs on the water. Shoreline covered.'], [4.4, 'UGV', 'UAV', 'UGVs rolling to the position.']],
  3: [[0.3, 'UAV', 'All', 'GPS jammed. Navigating on terrain and neighbours.', 'amber'], [3.0, 'UAV', 'All', 'Same map on every vehicle. Holding.']],
  4: [[0.3, 'UAV', 'All', 'Radio weak. Climbing to relay.', 'amber'], [3.0, 'USV', 'UAV', 'Hearing you through the relay.']],
  5: [[0.4, 'UAV', 'All', 'UAV-03 lost. Taking its search lane.', 'red']],
  6: [[0.3, 'UAV', 'UAV', 'Split. Search lines one to five.'], [3.0, 'USV', 'UAV', 'Water sectors searched. Shoreline held.']],
  7: [[0.3, 'UAV', 'UGV', `Eyes on ${task.ll}. Route clear.`], [3.0, 'UAV', 'Operator', tgt() ? 'Target position confirmed. Holding for approval.' : 'Position under watch. Reporting.', tgt() ? 'amber' : '']],
  8: [[0.4, 'Operator', 'All', `Task: ${task.type.toUpperCase()} at ${task.ll}.`], [2.0, 'UAV', 'Operator', 'Tasking received. Plan shared to every vehicle.'],
      [4.4, 'Operator', 'All', tgt() ? 'Approved.' : 'Keep watching. Report changes.'], [6.0, 'UGV', 'All', 'At the position. UAVs and USVs holding.']],
});

const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
// The film pipeline. src: the shot (video or slate texture). Everything after that is the "camera and print".
const FS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D src; uniform vec2 res, srcRes; uniform float t, fade, dirt;
float h(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float frameA(){ return max(res.x / res.y, 2.39); }
vec2 cover(vec2 u){ float a = frameA(), b = srcRes.x / srcRes.y; vec2 s = a > b ? vec2(1., b / a) : vec2(a / b, 1.); return (u - .5) * s + .5; }
vec3 tap(vec2 u){ return texture(src, cover(u)).rgb; }
void main(){
  // the 2.39:1 frame inside the pane: bars above and below with soft edges (none if the pane is already wider)
  float bar = max(0., (1. - (res.x / res.y) / 2.39) * .5);
  float lb = smoothstep(bar - .004, bar + .004, uv.y) * smoothstep(bar - .004, bar + .004, 1. - uv.y);
  vec2 u = vec2(uv.x, 1. - (uv.y - bar) / max(1. - 2. * bar, 1e-3));
  // edge chromatic aberration
  vec2 d = u - .5; float r2 = dot(d, d);
  vec3 c = vec3(tap(u + d * r2 * .006).r, tap(u).g, tap(u - d * r2 * .006).b);
  // highlights: anamorphic horizontal streak + soft bloom (thresholded taps)
  vec3 streak = vec3(0.), bloom = vec3(0.);
  for (int k = -12; k <= 12; k++) { vec3 s = tap(u + vec2(float(k) * .012, 0.)); streak += max(s - .82, 0.) * (1. - abs(float(k)) / 13.); }
  for (int k = 0; k < 8; k++) { float a = float(k) * .785; vec3 s = tap(u + vec2(cos(a), sin(a)) * .006); bloom += max(s - .7, 0.); }
  c += streak * vec3(.35, .55, .9) * .06 + bloom * .05;
  // grade: lift blacks to ~#0b0e11, cool shadows, muted warm highlights, a touch of contrast
  float l = dot(c, vec3(.2126, .7152, .0722));
  vec3 sh = vec3(.043, .055, .067), cool = vec3(.88, .97, 1.06), warm = vec3(1.04, 1.0, .93);
  c = mix(c * cool, c * warm, smoothstep(.25, .85, l)); c = mix(vec3(l), c, .9);
  c = sh + c * (1. - sh); c = smoothstep(0., 1.02, c);
  // vignette
  c *= mix(1., .62, smoothstep(.12, .62, r2 * 1.6));
  // lens dirt: only shows on bright frames
  float ld = smoothstep(.55, .85, n(u * 9.) * n(u * 23. + 3.)) * dirt; c += ld * .06 * vec3(1., .97, .9);
  // grain: animated, luma-weighted (stronger in the shadows), slightly chromatic
  float g = h(u * res + fract(t * 24.) * 97.) - .5; float gw = mix(.075, .03, smoothstep(.0, .7, l));
  c += g * gw * vec3(1., .96, 1.06);
  o = vec4(c * fade * lb + vec3(.043, .055, .067) * (1. - lb) * 0., 1.);
}`;

export async function startCinema({ RM }) {
  const sec = $('#mission'), box = $('#film'), cv = $('#film-gl'), log = $('#comms');
  const chs = [...sec.querySelectorAll('.ch')], steps = [...sec.querySelectorAll('.steps li')];
  let man = {}; try { man = await (await fetch('media/manifest.json')).json(); } catch {}
  // chapter -> its shots, in manifest order
  const shotsOf = i => Object.entries(man).filter(([, v]) => v.chapter === i + 1).map(([k, v]) => ({ id: k, ...v }));
  const gl = cv.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  if (!gl) { box.classList.add('nogl'); return; }
  const sh = (ty, s) => { const x = gl.createShader(ty); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n), uRes = U('res'), uSrc = U('srcRes'), uT = U('t'), uFade = U('fade'), uDirt = U('dirt');
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  let W = 0, H = 0;
  const fit = () => { const r = box.getBoundingClientRect(), dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = Math.round(r.width * dp); H = cv.height = Math.round(r.height * dp); gl.viewport(0, 0, W, H); };
  new ResizeObserver(fit).observe(box); fit();

  // ---- sources: a slate (2D canvas) until the shot is delivered, then its video
  const slate = document.createElement('canvas'); slate.width = 1920; slate.height = 804; const sx = slate.getContext('2d');
  const drawSlate = s => {
    const g = sx.createLinearGradient(0, 0, 0, 804); g.addColorStop(0, '#151a1f'); g.addColorStop(1, '#07090b'); sx.fillStyle = g; sx.fillRect(0, 0, 1920, 804);
    sx.fillStyle = '#9aa3a8'; sx.font = '500 26px "IBM Plex Mono", monospace'; sx.textBaseline = 'middle';
    const words = s.slug.split(' '), lines = []; let line = ''; for (const w of words) { if ((line + ' ' + w).length > 52) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w; } lines.push(line);
    sx.textAlign = 'center'; lines.forEach((ln, k) => sx.fillText(ln, 960, 420 + k * 40 - (lines.length - 1) * 20));
    sx.fillStyle = '#4d565c'; sx.font = '500 18px "IBM Plex Mono", monospace'; sx.fillText('FOOTAGE PENDING · PLACEHOLDER · ' + s.id, 960, 330);
  };
  const vid = document.createElement('video'); vid.muted = true; vid.playsInline = true; vid.loop = true; vid.preload = 'auto';
  const av1 = vid.canPlayType('video/mp4; codecs="av01.0.08M.10"');
  vid.addEventListener('error', () => { if (/-av1\.mp4$/.test(vid.src)) { vid.src = vid.src.replace(/-av1\.mp4$/, '.mp4'); vid.play().catch(() => {}); } });   // no AV1 file or no AV1 decoder: H.264
  let cur = -1, shot = null, mode = 'slate', fade = 0, fadeTo = 1, shotStart = 0, sub = 0;
  const load = s => {
    shot = s; shotStart = performance.now();
    if (s && s.ready) { mode = 'video'; const big = s.id === 'shot01_hero' && innerWidth > 1800; vid.src = `media/cine/${s.id}${big ? '-2560' : ''}${av1 ? '-av1' : ''}.mp4`; vid.play().catch(() => {}); }
    else { mode = 'slate'; vid.removeAttribute('src'); vid.load(); drawSlate(s || { id: 'none', slug: '' }); upload(slate, 1920, 804); }
  };
  const upload = (el, w, h) => { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, el); gl.uniform2f(uSrc, w, h); };

  // ---- radio: the chapter's lines arrive after it starts; said once per visit
  let timers = [];
  const say = ([, from, to, text, tone]) => { const li = document.createElement('li'); if (tone) li.className = tone;
    const b = document.createElement('b'); b.textContent = `${from} → ${to}`; const sp = document.createElement('span'); sp.textContent = text; li.append(b, sp); log.append(li);
    while (log.children.length > 3) log.firstElementChild.remove(); };
  const radio = i => { timers.forEach(clearTimeout); timers = []; log.textContent = ''; (RADIO()[i + 1] || []).forEach(l => timers.push(setTimeout(() => say(l), l[0] * 1000))); };

  // ---- the tasking console (final chapter)
  const ll = $('#tk-ll'), types = [...sec.querySelectorAll('.tk-type button')], go = $('#tk-go');
  types.forEach(b => b.addEventListener('click', () => { types.forEach(x => x.setAttribute('aria-checked', String(x === b))); task.type = b.dataset.type; }));
  go?.addEventListener('click', () => { task.ll = (ll.value || '').trim().slice(0, 40) || task.ll; radio(cur);
    go.textContent = 'Tasked'; go.classList.add('sent'); setTimeout(() => { go.textContent = 'Task the fleet'; go.classList.remove('sent'); }, 2500); });

  // ---- scroll -> chapter (and, inside a chapter with two shots, which half)
  const pick = () => {
    const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight), u = Math.min(.999, Math.max(0, -r.top / span));
    const i = Math.floor(u * chs.length), p = u * chs.length - i, list = shotsOf(i), j = list.length > 1 ? Math.min(list.length - 1, Math.floor(p * list.length)) : 0;
    if (i !== cur) { cur = i; chs.forEach((c, k) => c.classList.toggle('on', k === i)); steps.forEach((s, k) => s.classList.toggle('on', k <= i)); radio(i); }
    const s = list[j] || null; if ((s && s.id) !== (shot && shot.id)) { fadeTo = 0; pending = s; }
  };
  let pending = undefined;
  addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick);

  // ---- draw: 24 fps cadence; a dip to dark between shots
  let last = 0, running = false;
  const frame = now => {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 41) return; last = now;
    fade += (fadeTo - fade) * (RM ? 1 : .35);
    if (fadeTo === 0 && fade < .03 && pending !== undefined) { load(pending); pending = undefined; fadeTo = 1; }
    if (mode === 'video' && vid.readyState >= 2) upload(vid, vid.videoWidth, vid.videoHeight);
    const bright = mode === 'video' ? .8 : 0;
    gl.uniform2f(uRes, W, H); gl.uniform1f(uT, now / 1000); gl.uniform1f(uFade, fade); gl.uniform1f(uDirt, bright);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const vis = on => { if (on && !running) { running = true; if (mode === 'video') vid.play().catch(() => {}); requestAnimationFrame(frame); } else if (!on && running) { running = false; vid.pause(); } };
  new IntersectionObserver(es => vis(es.some(e => e.isIntersecting))).observe(box);
  document.addEventListener('visibilitychange', () => vis(document.visibilityState === 'visible'));
  await document.fonts.ready.catch(() => {});
  pick(); load(pending ?? shotsOf(0)[0] ?? null); pending = undefined; fadeTo = 1;
}
