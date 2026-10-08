// HiveNodes: an optional sound bed, synthesised in the browser (zero bytes of audio downloaded). Only on request; fades
// in and out; follows tab visibility. Layers: wind at altitude (brown noise, wandering band-pass, gusts); a distant small
// turbojet (high band-passed noise whose pitch drifts slowly, as one passes far off); water lapping on gravel (low-passed
// noise in slow irregular swells). click(): a soft radio key-up, used on each chapter change.
let ctx = null, master = null, on = false;
function noise(seconds, brown) {
  const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } else d[i] = w; } }
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
}
const lfo = (hz, depth, target) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hz; g.gain.value = depth; o.connect(g).connect(target); o.start(); };
function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  // wind
  const w = noise(4, true), bp = ctx.createBiquadFilter(), wg = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .6; wg.gain.value = .5;
  w.connect(bp).connect(wg).connect(master); lfo(.07, 260, bp.frequency); lfo(.11, .22, wg.gain); w.start();
  // distant turbojet: a thin high whine plus hiss, far down in the mix, pitch drifting
  const j = noise(3, false), jb = ctx.createBiquadFilter(), jg = ctx.createGain(); jb.type = 'bandpass'; jb.frequency.value = 1800; jb.Q.value = 3; jg.gain.value = .035;
  j.connect(jb).connect(jg).connect(master); lfo(.03, 500, jb.frequency); lfo(.05, .02, jg.gain); j.start();
  const tone = ctx.createOscillator(), tg = ctx.createGain(); tone.type = 'sawtooth'; tone.frequency.value = 2400; tg.gain.value = .004;
  const tl = ctx.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 3000; tone.connect(tl).connect(tg).connect(master); lfo(.03, 140, tone.frequency); tone.start();
  // water lapping: low noise in swells
  const l = noise(4, false), lp = ctx.createBiquadFilter(), lg = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 700; lg.gain.value = .0;
  l.connect(lp).connect(lg).connect(master); lfo(.45, .06, lg.gain); lfo(.17, .04, lg.gain); l.start();
  document.addEventListener('visibilitychange', () => { if (master) fade(on && document.visibilityState === 'visible' ? .5 : 0, .6); });
}
function fade(to, s) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + s); }
export function toggleSound(want) {
  if (!ctx) build(); if (ctx.state === 'suspended') ctx.resume();
  on = want; fade(on ? .5 : 0, on ? 2.5 : .8);
}
export function click() {
  if (!ctx || !on) return;
  const t = ctx.currentTime, s = noise(.2, false), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 1.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.12, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + .09);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + .12);
}
