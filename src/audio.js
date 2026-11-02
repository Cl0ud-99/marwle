// Tiny generative soundscape: warm pad, soft city air, glassy chimes and water.
export function createAudio() {
  let ctx = null, master = null, started = false, muted = false;
  let chimeTimer = null;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);

    // warm pad
    const padGain = ctx.createGain(); padGain.gain.value = .13;
    const filter = ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=740; filter.Q.value=.35;
    padGain.connect(filter); filter.connect(master);
    const freqs = [130.81, 164.81, 196.0, 246.94, 293.66, 329.63];
    freqs.forEach((f,i)=>{
      const o = ctx.createOscillator();
      o.type = i%2 ? 'triangle' : 'sine';
      o.frequency.value = f * (i%2?1:2);
      o.detune.value = (i-2.5)*3.2;
      const g = ctx.createGain(); g.gain.value = i===0?.10:.04 + (i%3)*.016;
      const lfo = ctx.createOscillator(); lfo.frequency.value=.035+i*.011;
      const lg=ctx.createGain(); lg.gain.value=.018; lfo.connect(lg); lg.connect(g.gain); lfo.start();
      o.connect(g); g.connect(padGain); o.start();
    });

    // airy city noise
    const len = ctx.sampleRate * 8;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1)*.3;
    const noise = ctx.createBufferSource(); noise.buffer=buf; noise.loop=true;
    const nf = ctx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=680; nf.Q.value=.7;
    const ng = ctx.createGain(); ng.gain.value=.018;
    noise.connect(nf); nf.connect(ng); ng.connect(master); noise.start();

    // water babble
    const nf2 = ctx.createBiquadFilter(); nf2.type='bandpass'; nf2.frequency.value=1500; nf2.Q.value=.55;
    const ng2 = ctx.createGain(); ng2.gain.value=.012;
    const noise2 = ctx.createBufferSource(); noise2.buffer=buf; noise2.loop=true;
    const lfo=ctx.createOscillator(); lfo.frequency.value=.23; const lg=ctx.createGain(); lg.gain.value=.006; lfo.connect(lg); lg.connect(ng2.gain); lfo.start();
    noise2.connect(nf2); nf2.connect(ng2); ng2.connect(master); noise2.start();

    // soft pentatonic chimes
    let step=0;
    const notes=[523.25,587.33,659.25,783.99,880,1046.5];
    function chime(){
      if(muted || !ctx) return;
      const f=notes[(step*3+1)%notes.length]; step++;
      const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f;
      const g=ctx.createGain(); g.gain.setValueAtTime(0,ctx.currentTime); g.gain.linearRampToValueAtTime(.025,ctx.currentTime+.02); g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+2.8);
      const p=ctx.createStereoPanner(); p.pan.value=(Math.random()-.5)*.7;
      o.connect(g); g.connect(p); p.connect(master); o.start(); o.stop(ctx.currentTime+3);
      const delay=ctx.createDelay(); delay.delayTime.value=.28; const dg=ctx.createGain(); dg.gain.value=.18; p.connect(delay); delay.connect(dg); dg.connect(master);
    }
    chimeTimer=setInterval(()=>{ if(Math.random()>.42) chime(); }, 4200);
    return true;
  }

  function start() {
    if (!started) { started = build() || false; }
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted?0:.75, ctx.currentTime+1.2);
  }
  function toggle() { muted=!muted; if(ctx){master.gain.linearRampToValueAtTime(muted?0:.75,ctx.currentTime+.25);} return !muted; }
  function setVolume(v){ if(master&&ctx) master.gain.linearRampToValueAtTime(muted?0:v,ctx.currentTime+.2); }
  return { start, toggle, get muted(){return muted;}, get context(){return ctx;} };
}
