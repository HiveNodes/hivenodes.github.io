// HiveNodes homepage: an optional sound bed, made here rather than downloaded (zero bytes of audio).
// Wind at altitude: brown noise through a slowly wandering band-pass, with gusts. Under it, one low
// note that breathes. Starts only when the visitor asks; fades in and out; follows the tab's visibility.
let ctx = null, master = null;

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

  // brown noise, 4 s loop
  const len = ctx.sampleRate * 4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = last * 3.2; } }
  const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const windG = ctx.createGain(); windG.gain.value = .55;
  noise.connect(bp).connect(lp).connect(windG).connect(master);
  // gusts: two slow LFOs on the band centre and the level
  const lfo1 = ctx.createOscillator(), lfo1g = ctx.createGain(); lfo1.frequency.value = .07; lfo1g.gain.value = 260; lfo1.connect(lfo1g).connect(bp.frequency);
  const lfo2 = ctx.createOscillator(), lfo2g = ctx.createGain(); lfo2.frequency.value = .11; lfo2g.gain.value = .25; lfo2.connect(lfo2g).connect(windG.gain);

  // the low note: two detuned sines an octave apart, breathing through a low-pass
  const dr = ctx.createGain(); dr.gain.value = .0;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
  [[55, 0], [55.4, 0], [110.2, .35]].forEach(([hz, det]) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz; const g = ctx.createGain(); g.gain.value = det ? .18 : .32; o.connect(g).connect(f); o.start(); });
  f.connect(dr).connect(master);
  const br = ctx.createOscillator(), brg = ctx.createGain(); br.frequency.value = .045; brg.gain.value = .09; br.connect(brg).connect(dr.gain);
  dr.gain.setValueAtTime(.12, ctx.currentTime);

  noise.start(); lfo1.start(); lfo2.start(); br.start();
  document.addEventListener('visibilitychange', () => { if (!master) return; const on = document.visibilityState === 'visible' && window.__hvSound; fade(on ? .5 : 0, .6); });
}
function fade(to, s) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(to, t + s); }

export function toggleSound(on) {
  if (!ctx) build();
  if (ctx.state === 'suspended') ctx.resume();
  window.__hvSound = on; fade(on ? .5 : 0, on ? 2.5 : .8);
}
