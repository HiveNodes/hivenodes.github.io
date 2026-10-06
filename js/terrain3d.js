// HiveNodes hero, 3D: REAL terrain, not a render. The Copernicus DEM (media/ops-height-257.u16, 32 m posts over the
// 8.2 km window) is draped with the Copernicus Sentinel-2 true-colour image (media/ops-map-*.webp), whose shadows are
// the real sun's. A slow oblique camera follows the film's simulated fleet (media/ops-tracks.json); the fleet and the
// instrument marks are drawn into the same single canvas. Distance haze is the only effect added to the ground.
const LOST_BELOW = 80;

export async function startTerrain3D({ cv, onTime, RM }) {
  const im = s => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = s; });
  const [tr, imgN, imgF, hN, hF] = await Promise.all([
    fetch('media/ops-tracks.json').then(r => r.json()), im('media/t3d-near-2048.webp'), im('media/t3d-far-1024.webp'),
    fetch('media/t3d-near-385.u16').then(r => r.arrayBuffer()), fetch('media/t3d-far-201.u16').then(r => r.arrayBuffer()),
  ]);
  const gcv = document.createElement('canvas');
  const gl = gcv.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('no webgl2');
  const ctx = cv.getContext('2d');
  const V = Object.entries(tr.v), N = tr.n, DT = tr.dt, DUR = N * DT;
  const TILES = [{ size: 40000, n: 201, h: new Uint16Array(hF), img: imgF, sink: true }, { size: 20000, n: 385, h: new Uint16Array(hN), img: imgN }];
  const NEAR = TILES[1];
  const hAt = (x, y) => { const T = Math.abs(x) < 9900 && Math.abs(y) < 9900 ? NEAR : TILES[0], NH = T.n, SZ = T.size;
    const fx = (x + SZ / 2) / SZ * (NH - 1), fy = (SZ / 2 - y) / SZ * (NH - 1);
    const i = Math.max(0, Math.min(NH - 2, Math.floor(fx))), j = Math.max(0, Math.min(NH - 2, Math.floor(fy))), a = fx - i, b = fy - j;
    const g = (ii, jj) => T.h[jj * NH + ii]; return (g(i, j) * (1 - a) + g(i + 1, j) * a) * (1 - b) + (g(i, j + 1) * (1 - a) + g(i + 1, j + 1) * a) * b; };
  for (const T of TILES) {          // mesh per tile: x east, y up, z south; the far ring sinks 40 m inside the near tile
    const NH = T.n, SZ = T.size, pos = new Float32Array(NH * NH * 3), uv = new Float32Array(NH * NH * 2);
    for (let j = 0; j < NH; j++) for (let i = 0; i < NH; i++) { const k = j * NH + i, x = -SZ / 2 + i / (NH - 1) * SZ, z = -SZ / 2 + j / (NH - 1) * SZ;
      const inside = T.sink && Math.abs(x) < 9800 && Math.abs(z) < 9800;
      pos[k * 3] = x; pos[k * 3 + 1] = T.h[k] - (inside ? 40 : 0); pos[k * 3 + 2] = z; uv[k * 2] = i / (NH - 1); uv[k * 2 + 1] = j / (NH - 1); }
    const idx = new Uint32Array((NH - 1) * (NH - 1) * 6); let q = 0;
    for (let j = 0; j < NH - 1; j++) for (let i = 0; i < NH - 1; i++) { const a = j * NH + i, b = a + 1, c = a + NH, d = c + 1; idx.set([a, c, b, b, c, d], q); q += 6; }
    Object.assign(T, { pos, uv, idx });
  }
  const vs = `#version 300 es
in vec3 p; in vec2 t; uniform mat4 m; out vec2 vt; out float dist; uniform vec3 eye;
void main(){ vt = t; dist = distance(p, eye); gl_Position = m * vec4(p, 1.); }`;
  const fs = `#version 300 es
precision highp float; in vec2 vt; in float dist; uniform sampler2D tex; uniform vec3 haze; out vec4 o;
void main(){ vec3 c = texture(tex, vt).rgb; float f = 1. - exp(-dist / 11000.); o = vec4(mix(c * 1.08, haze, clamp(f * 1.05, 0., .96)), 1.); }`;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = (data, loc, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, loc); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 0, 0); };
  const ext = gl.getExtension('EXT_texture_filter_anisotropic');
  for (const T of TILES) {
    T.vao = gl.createVertexArray(); gl.bindVertexArray(T.vao); buf(T.pos, 'p', 3); buf(T.uv, 't', 2);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, T.idx, gl.STATIC_DRAW);
    T.tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T.tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, T.img);
    gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  }
  const uM = gl.getUniformLocation(pr, 'm'), uEye = gl.getUniformLocation(pr, 'eye'), uHaze = gl.getUniformLocation(pr, 'haze');
  gl.enable(gl.DEPTH_TEST);

  // ---- matrices
  const persp = (f, a, n, fr) => { const t = 1 / Math.tan(f / 2); return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, 2 * fr * n / (n - fr), 0]; };
  const look = (e, c) => { const z = norm([e[0] - c[0], e[1] - c[1], e[2] - c[2]]), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = a => { const l = Math.hypot(...a); return a.map(v => v / l); };
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };

  let W = 0, H = 0, dp = 1, t = 0, last = performance.now(), running = false, seekTo = null, M = null;
  const fit = () => { const r = cv.getBoundingClientRect(); dp = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = gcv.width = Math.round(r.width * dp); H = cv.height = gcv.height = Math.round(r.height * dp); };
  new ResizeObserver(fit).observe(cv); fit();
  const cam = { tx: 300, tz: -600, ready: false };
  const at = (p, u) => { const i = Math.min(N - 2, Math.floor(u)), f = Math.min(1, u - i), a = p[i], b = p[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  const proj = (x, y, z) => { const v = [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[3] * x + M[7] * y + M[11] * z + M[15]];
    return v[2] > 1 ? [W / 2 + v[0] / v[2] * W / 2, H / 2 - v[1] / v[2] * H / 2, v[2]] : null; };

  function draw() {
    if (!W || !H) { fit(); if (!W || !H) return; }
    const u = t / DT, jam = t >= 17 && t < 34, jamK = jam ? Math.min(1, (t - 17) / 6) * (t > 28 ? Math.max(.35, 1 - (t - 28) / 8) : 1) : 0;
    let cx = 0, cz = 0, n = 0;
    for (const [, v] of V) { if (v.k !== 'lead' && v.k !== 'air') continue; const p = at(v.p, u); if (v.k === 'lead' && t > 20 && p[2] < LOST_BELOW) continue; cx += p[0]; cz -= p[1]; n++; }
    cx /= n; cz /= n; const k = cam.ready && !RM ? .02 : 1; cam.tx += (cx - cam.tx) * k; cam.tz += (cz - cam.tz) * k; cam.ready = true;
    // camera: an oblique view from the south-west, 2.6 km back and 1.1 km up, orbiting very slowly
    const ang = -2.35 + Math.sin(t / DUR * Math.PI * 2) * .3, D = 3200;
    const eye = [cam.tx + Math.cos(ang) * D, 1150, cam.tz - Math.sin(ang) * D], tgt = [cam.tx, 300, cam.tz];   // steep enough that the frame never leaves the real 8.2 km of imagery
    M = mul(persp(.6, W / H, 40, 60000), look(eye, tgt));
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uM, false, new Float32Array(M)); gl.uniform3f(uEye, ...eye); gl.uniform3f(uHaze, .70, .76, .83);
    for (const T of TILES) { gl.bindVertexArray(T.vao); gl.bindTexture(gl.TEXTURE_2D, T.tx); gl.drawElements(gl.TRIANGLES, T.idx.length, gl.UNSIGNED_INT, 0); }
    // sky gradient above the horizon, then the terrain
    const g = ctx.createLinearGradient(0, 0, 0, H * .5); g.addColorStop(0, '#4f6f93'); g.addColorStop(1, '#b3c2d4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.drawImage(gcv, 0, 0);
    // the fleet: track lines in 3D, then the marks
    ctx.font = `${11 * dp}px "IBM Plex Mono", monospace`; ctx.lineWidth = dp; const labels = [];
    for (const [name, v] of V) {
      const p = at(v.p, u), lost = v.k === 'lead' && t > 20 && p[2] < LOST_BELOW;
      const s = proj(p[0], v.k === 'gnd' || v.k === 'sea' ? hAt(p[0], p[1]) + 4 : p[2], -p[1]); if (!s) continue;
      ctx.strokeStyle = v.k === 'gnd' || v.k === 'sea' ? 'rgba(255,226,170,.5)' : 'rgba(255,255,255,.4)'; ctx.beginPath(); let first = true;
      for (let j = 0; j <= 10; j++) { const r = at(v.p, Math.max(0, u - j * .5)), z = v.k === 'gnd' || v.k === 'sea' ? hAt(r[0], r[1]) + 4 : r[2], ss = proj(r[0], z, -r[1]); if (!ss) continue; first ? ctx.moveTo(ss[0], ss[1]) : ctx.lineTo(ss[0], ss[1]); first = false; }
      ctx.stroke();
      if (lost) { ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2 * dp; const r = 6 * dp; ctx.beginPath(); ctx.moveTo(s[0] - r, s[1] - r); ctx.lineTo(s[0] + r, s[1] + r); ctx.moveTo(s[0] + r, s[1] - r); ctx.lineTo(s[0] - r, s[1] + r); ctx.stroke(); ctx.lineWidth = dp;
        ctx.fillStyle = '#ff5a4a'; ctx.fillText(`WEDGE ${+name.split('_')[1] + 1} LEAD LOST`, s[0] + 10 * dp, s[1] - 8 * dp); continue; }
      if (jamK > 0 && v.k !== 'gnd' && v.k !== 'sea') { ctx.strokeStyle = `rgba(242,181,68,${.35 * jamK})`; ctx.beginPath(); ctx.arc(s[0], s[1], (4 + 16 * jamK) * dp, 0, 7); ctx.stroke(); }
      const sz = (v.k === 'lead' ? 3.4 : v.k === 'air' ? 2.4 : 3) * dp;
      // a shadow on the real ground below each aircraft, the cue that puts it in the air
      if (v.k === 'lead' || v.k === 'air') { const gsh = proj(p[0], hAt(p[0], p[1]), -p[1]); if (gsh) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(gsh[0], gsh[1], sz * 1.3, sz * .5, 0, 0, 7); ctx.fill(); } }
      ctx.fillStyle = v.k === 'gnd' ? '#ffe2aa' : v.k === 'sea' ? '#bfe6f5' : '#ffffff'; ctx.beginPath(); ctx.arc(s[0], s[1], sz, 0, 7); ctx.fill();
      if (v.k === 'lead' && !labels.some(([lx, ly]) => Math.abs(lx - s[0]) < 80 * dp && Math.abs(ly - s[1]) < 16 * dp)) { labels.push([s[0], s[1]]); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText(`WEDGE ${+name.split('_')[1] + 1}`, s[0] + 9 * dp, s[1] - 7 * dp); }
    }
    // instrument chrome (real state only)
    ctx.fillStyle = 'rgba(5,7,10,.62)'; ctx.fillRect(10 * dp, 10 * dp, 280 * dp, 40 * dp); ctx.fillRect(W - 140 * dp, H - 40 * dp, 132 * dp, 28 * dp);
    const lat = 33.900556 - cam.tz / 111132, lon = 78.493611 + cam.tx / (111320 * Math.cos(33.900556 * Math.PI / 180));
    ctx.fillStyle = 'rgba(230,234,238,.9)'; ctx.fillText(`${lat.toFixed(4)}° N  ${lon.toFixed(4)}° E  · 4,244 m`, 16 * dp, 26 * dp);
    ctx.fillStyle = 'rgba(242,181,68,.95)'; ctx.fillText('SIMULATED FLEET · REAL TERRAIN', 16 * dp, 43 * dp);
    ctx.fillStyle = 'rgba(230,234,238,.85)'; ctx.fillText(`SIM T+00:${String(Math.floor(t)).padStart(2, '0')}`, W - 120 * dp, H - 22 * dp);
  }
  function frame(now) {
    if (!running) return; requestAnimationFrame(frame);
    if (now - last < 31) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (seekTo !== null) { t = seekTo; seekTo = null; } else t = (t + dt) % DUR;
    draw(); onTime(t);
  }
  draw(); onTime(0);
  const vis = on => { if (on && !running && !RM) { running = true; last = performance.now(); requestAnimationFrame(frame); } else if (!on) running = false; };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => vis(es.some(e => e.isIntersecting))).observe(cv); else vis(true);
  cv.classList.add('on'); cv.parentElement.classList.add('filmon');
  return { seek: s => { seekTo = s; if (!running) { t = s; draw(); onTime(t); } } };
}
