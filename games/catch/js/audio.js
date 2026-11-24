/* =========================================================
   PLAY WITH VIZEA — Audio engine
   Musique et effets 100 % originaux, synthétisés en temps réel
   avec la Web Audio API (aucun fichier externe, libre de droits).
   ========================================================= */
(function () {
  "use strict";

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  let ctx = null, master, musicBus, sfxBus, comp, noiseBuf, delay, delayFb, delayWet;
  let musicOn = store.get("pwv_music", true);
  let sfxOn = store.get("pwv_sfx", true);

  // ----- music state -----
  const BPM = 122;
  const STEP = 60 / BPM / 4; // 16th note
  let playing = false, nextTime = 0, step = 0, timer = null;
  let mode = "menu"; // menu | game
  let intensity = 0; // 0..4

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // i – VI – III – VII  (Am – F – C – G) : énergie pop / gaming
  const PROG = [
    { root: 45, tones: [57, 60, 64, 69] }, // Am
    { root: 41, tones: [57, 60, 65, 69] }, // F
    { root: 48, tones: [55, 60, 64, 67] }, // C
    { root: 43, tones: [55, 59, 62, 67] }, // G
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const LEAD = [ // petite mélodie (index de tonalité, -1 = silence) sur 2 mesures
    3, -1, 2, -1, 3, -1, -1, 1, 2, -1, 1, -1, 0, -1, -1, -1,
    1, -1, 2, -1, 3, -1, 2, 3, -1, -1, 2, -1, 1, -1, -1, -1,
  ];

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.85;
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.42 : 0;
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.7 : 0;
    // ping-pong-ish delay for lead
    delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.32;
    delayWet = ctx.createGain(); delayWet.gain.value = 0.3;
    delay.connect(delayFb); delayFb.connect(delay); delay.connect(delayWet); delayWet.connect(musicBus);
    musicBus.connect(comp); sfxBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    // noise buffer
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() {
    init();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  // ----- primitives -----
  function tone(freq, t, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const vol = o.vol == null ? 0.2 : o.vol;
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.setValueAtTime(o.lp, t); f.Q.value = o.q || 1;
      if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur);
      node.connect(f); node = f;
    }
    node.connect(g);
    g.connect(o.dest || sfxBus);
    if (o.send) g.connect(delay);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  function noise(t, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.ftype || "highpass"; f.frequency.value = o.freq || 6000; f.Q.value = o.q || 0.8;
    const g = ctx.createGain();
    const vol = o.vol == null ? 0.1 : o.vol;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  function kick(t, vol) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g); g.connect(musicBus);
    osc.start(t); osc.stop(t + 0.35);
  }

  // ----- music sequencer -----
  function playStep(i, t) {
    const s = i % 16;
    const bar = Math.floor(i / 16) % 4;
    const ch = PROG[bar];
    const game = mode === "game";
    const lv = intensity;

    // drums
    if (game) {
      if (s % 4 === 0) kick(t, 0.55);
      if (lv >= 2 && (s === 14 || s === 7)) kick(t, 0.32);
      if (s === 4 || s === 12) { noise(t, 0.18, { ftype: "bandpass", freq: 1800, q: 0.7, vol: 0.32, dest: musicBus }); tone(190, t, 0.08, { type: "triangle", vol: 0.12, dest: musicBus }); }
      if (s % 2 === 0) noise(t, 0.04, { freq: 8000, vol: s % 4 === 2 ? 0.09 : 0.04, dest: musicBus });
      else if (lv >= 3) noise(t, 0.03, { freq: 9000, vol: 0.03, dest: musicBus });
    } else {
      if (s === 0 || s === 10) kick(t, 0.35);
      if (s === 8) noise(t, 0.25, { ftype: "bandpass", freq: 2200, vol: 0.12, dest: musicBus });
      if (s % 4 === 2) noise(t, 0.03, { freq: 9000, vol: 0.03, dest: musicBus });
    }

    // bass
    const bassHits = game ? [0, 3, 6, 8, 10, 11, 14] : [0, 6, 8, 14];
    if (bassHits.includes(s)) {
      const oct = (s === 6 || s === 14) ? 12 : 0;
      tone(mtof(ch.root + oct - 12 + 12), t, STEP * 1.7, { type: "sawtooth", vol: 0.16, lp: 900, lpEnd: 200, q: 6, dest: musicBus });
      tone(mtof(ch.root - 12 + oct), t, STEP * 1.7, { type: "sine", vol: 0.22, dest: musicBus });
    }

    // pad
    if (s === 0) {
      ch.tones.slice(0, 3).forEach((m, k) => {
        tone(mtof(m), t, STEP * 15, { type: "sawtooth", vol: 0.028, attack: 0.25, lp: game ? 1600 : 1100, detune: k * 4 - 4, dest: musicBus });
      });
    }

    // arp
    if (s % 2 === 0 || (game && lv >= 1)) {
      const idx = ARP[(s >> (game && lv >= 1 ? 0 : 1)) % ARP.length];
      const m = ch.tones[idx] + (lv >= 4 ? 12 : 0) + 12;
      tone(mtof(m), t, STEP * 0.9, { type: "square", vol: game ? 0.045 : 0.035, lp: 2600 + lv * 500, dest: musicBus, send: true });
    }

    // lead melody (game, from level 2)
    if (game && lv >= 1) {
      const li = LEAD[(i % 32)];
      if (li >= 0) tone(mtof(ch.tones[li] + 12), t, STEP * 2.2, { type: "triangle", vol: 0.09, dest: musicBus, send: true });
    }
  }

  function scheduler() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(step, nextTime);
      nextTime += STEP;
      step++;
    }
    timer = setTimeout(scheduler, 25);
  }

  function startMusic() {
    if (!ctx || playing || !musicOn) return;
    playing = true;
    nextTime = ctx.currentTime + 0.06;
    step = 0;
    scheduler();
  }
  function stopMusic() {
    playing = false;
    clearTimeout(timer);
  }

  // ----- SFX -----
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const sfx = {
    click() { tone(1400, now(), 0.05, { type: "triangle", vol: 0.12 }); },
    hover() { tone(2200, now(), 0.03, { type: "sine", vol: 0.04 }); },
    catch(combo) {
      const t = now();
      const n = 72 + PENTA[Math.min(PENTA.length - 1, combo % PENTA.length)];
      tone(mtof(n), t, 0.12, { type: "square", vol: 0.11, lp: 4000 });
      tone(mtof(n + 12), t + 0.035, 0.1, { type: "triangle", vol: 0.08 });
    },
    star() {
      const t = now();
      [76, 79, 84, 88].forEach((n, k) => tone(mtof(n), t + k * 0.045, 0.16, { type: "square", vol: 0.08, lp: 5000 }));
    },
    bad() {
      const t = now();
      tone(220, t, 0.32, { type: "sawtooth", vol: 0.22, slide: 55, lp: 1400 });
      noise(t, 0.22, { ftype: "lowpass", freq: 900, vol: 0.25 });
    },
    shield() { const t = now(); tone(600, t, 0.2, { type: "triangle", vol: 0.15, slide: 1200 }); noise(t, 0.12, { freq: 5000, vol: 0.06 }); },
    power() {
      const t = now();
      [60, 64, 67, 72, 76, 79, 84].forEach((n, k) => tone(mtof(n + 7), t + k * 0.035, 0.14, { type: "square", vol: 0.07, lp: 6000 }));
    },
    combo(level) {
      const t = now();
      const base = 79 + Math.min(level, 5) * 2;
      tone(mtof(base), t, 0.1, { type: "square", vol: 0.08 });
      tone(mtof(base + 5), t + 0.07, 0.18, { type: "square", vol: 0.08 });
    },
    tick() { tone(1800, now(), 0.04, { type: "square", vol: 0.06 }); },
    count(go) {
      const t = now();
      if (go) { tone(mtof(84), t, 0.45, { type: "square", vol: 0.12, lp: 5000 }); tone(mtof(91), t, 0.45, { type: "triangle", vol: 0.1 }); }
      else tone(mtof(72), t, 0.18, { type: "square", vol: 0.1, lp: 3000 });
    },
    correct() { const t = now(); tone(mtof(76), t, 0.12, { type: "square", vol: 0.1 }); tone(mtof(83), t + 0.09, 0.22, { type: "square", vol: 0.1 }); },
    wrong() { const t = now(); tone(mtof(52), t, 0.16, { type: "sawtooth", vol: 0.14, lp: 1200 }); tone(mtof(46), t + 0.13, 0.28, { type: "sawtooth", vol: 0.14, lp: 1000 }); },
    levelUp() {
      const t = now();
      [72, 76, 79, 84].forEach((n, k) => tone(mtof(n), t + k * 0.09, 0.3, { type: "square", vol: 0.09, lp: 5000 }));
      tone(mtof(88), t + 0.36, 0.6, { type: "triangle", vol: 0.12 });
      noise(t + 0.36, 0.6, { freq: 7000, vol: 0.05 });
    },
    record() {
      const t = now();
      [79, 84, 88, 91, 96].forEach((n, k) => tone(mtof(n), t + k * 0.06, 0.25, { type: "triangle", vol: 0.1 }));
    },
    gameOver() {
      const t = now();
      [67, 63, 60, 55].forEach((n, k) => tone(mtof(n), t + k * 0.2, 0.32, { type: "sawtooth", vol: 0.1, lp: 1500 }));
      tone(mtof(43), t + 0.8, 1.2, { type: "sine", vol: 0.25 });
    },
    victory() {
      const t = now();
      // fanfare originale : C – F – G – C (montée triomphale)
      const seq = [
        [0.00, [60, 64, 67, 72], 0.18], [0.20, [60, 64, 67, 72], 0.18], [0.40, [60, 64, 67, 72], 0.18],
        [0.62, [65, 69, 72, 77], 0.40], [1.05, [67, 71, 74, 79], 0.40], [1.50, [72, 76, 79, 84], 1.6],
      ];
      seq.forEach(([dt, notes, d]) => notes.forEach((n, k) => {
        tone(mtof(n), t + dt, d, { type: "sawtooth", vol: 0.05, lp: 3500, attack: 0.02, detune: k * 3 });
        tone(mtof(n), t + dt, d, { type: "square", vol: 0.025, lp: 2500 });
      }));
      [0, 0.62, 1.05, 1.5].forEach((dt) => { noise(t + dt, 0.8, { freq: 6000, vol: 0.1 }); kickSfx(t + dt); });
      // sparkle
      for (let k = 0; k < 14; k++) tone(mtof(96 + PENTA[k % 6]), t + 1.6 + k * 0.07, 0.12, { type: "sine", vol: 0.05 });
    },
    firework() { const t = now(); noise(t, 0.5, { ftype: "lowpass", freq: 1200 + Math.random() * 800, vol: 0.12 }); },
  };

  function kickSfx(t) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(g); g.connect(sfxBus); osc.start(t); osc.stop(t + 0.45);
  }

  function now() { return ctx.currentTime + 0.005; }

  window.VZAudio = {
    resume,
    play(name, arg) {
      if (!ctx || !sfxOn || !sfx[name]) return;
      try { sfx[name](arg); } catch (e) { /* ignore */ }
    },
    startMusic() { resume(); startMusic(); },
    stopMusic,
    setMode(m, lv) { mode = m; intensity = lv || 0; },
    duck(on) {
      if (!ctx) return;
      musicBus.gain.setTargetAtTime(musicOn ? (on ? 0.12 : 0.42) : 0, ctx.currentTime, 0.15);
    },
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; },
    toggleMusic() {
      musicOn = !musicOn; store.set("pwv_music", musicOn);
      if (ctx) {
        musicBus.gain.setTargetAtTime(musicOn ? 0.42 : 0, ctx.currentTime, 0.08);
        if (musicOn) startMusic(); else setTimeout(() => { if (!musicOn) stopMusic(); }, 300);
      }
      return musicOn;
    },
    toggleSfx() {
      sfxOn = !sfxOn; store.set("pwv_sfx", sfxOn);
      if (ctx) sfxBus.gain.setTargetAtTime(sfxOn ? 0.7 : 0, ctx.currentTime, 0.03);
      return sfxOn;
    },
    store,
  };
  // la musique s'arrête quand on quitte l'onglet, et reprend au retour
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === "running") ctx.suspend(); }
    else if (ctx.state === "suspended") ctx.resume();
  });
  window.addEventListener("pagehide", () => { if (ctx && ctx.state === "running") ctx.suspend(); });
})();
