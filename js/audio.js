/* =========================================================
   ViZea Jump — moteur audio
   Musiques et effets 100 % originaux, synthétisés en direct
   (Web Audio API, aucun fichier externe, libres de droits).
   ========================================================= */
(function () {
  "use strict";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  // ----- thèmes musicaux -----
  const THEMES = {
    pulse: { label: "Pulse", bpm: 122, prog: [[45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [48, [55, 60, 64, 67]], [43, [55, 59, 62, 67]]], soft: false, lead: true, wave: "square" },
    chill: { label: "Chill", bpm: 92, prog: [[41, [57, 60, 64, 65]], [45, [57, 60, 64, 67]], [43, [55, 59, 62, 67]], [40, [55, 59, 64, 67]]], soft: true, lead: true, wave: "triangle" },
    hype:  { label: "Hype", bpm: 138, prog: [[40, [55, 59, 64, 67]], [48, [55, 60, 64, 67]], [43, [55, 59, 62, 67]], [50, [57, 62, 66, 69]]], soft: false, lead: true, wave: "sawtooth" },
    viral: { label: "Viral", bpm: 134, prog: [[48, [60, 63, 67, 72]], [44, [60, 63, 68, 72]], [51, [58, 63, 67, 70]], [46, [58, 62, 65, 70]]], soft: false, lead: true, wave: "square", big: true },
  };
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const LEAD = [3, -1, 2, -1, 3, -1, -1, 1, 2, -1, 1, -1, 0, -1, -1, -1, 1, -1, 2, -1, 3, -1, 2, 3, -1, -1, 2, -1, 1, -1, -1, -1];
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  let ctx = null, master, musicBus, sfxBus, comp, noiseBuf, delay, delayFb, delayWet;
  // musique et effets toujours activés à l'ouverture du jeu (le bouton coupe seulement pour la partie en cours)
  let musicOn = true, sfxOn = true;
  let musicVol = store.get("vzj_mvol", 0.7), sfxVol = store.get("vzj_svol", 0.8);
  let baseTheme = store.get("vzj_theme", "pulse");
  if (!THEMES[baseTheme] || baseTheme === "viral") baseTheme = "pulse";
  let theme = THEMES[baseTheme];
  let STEP = 60 / theme.bpm / 4;
  let playing = false, nextTime = 0, step = 0, timer = null, mode = "menu", intensity = 0, duckAmt = 1;

  const mGain = () => (musicOn ? musicVol * 0.6 * duckAmt : 0);
  const sGain = () => (sfxOn ? sfxVol : 0);

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.85;
    musicBus = ctx.createGain(); musicBus.gain.value = mGain();
    sfxBus = ctx.createGain(); sfxBus.gain.value = sGain();
    delay = ctx.createDelay(1); delay.delayTime.value = STEP * 3;
    delayFb = ctx.createGain(); delayFb.gain.value = 0.3;
    delayWet = ctx.createGain(); delayWet.gain.value = 0.28;
    delay.connect(delayFb); delayFb.connect(delay); delay.connect(delayWet); delayWet.connect(musicBus);
    musicBus.connect(comp); sfxBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume() { init(); if (ctx && ctx.state === "suspended") ctx.resume(); }
  function applyGains() {
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(mGain(), ctx.currentTime, 0.08);
    sfxBus.gain.setTargetAtTime(sGain(), ctx.currentTime, 0.03);
  }

  function tone(freq, t, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const vol = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.setValueAtTime(o.lp, t); f.Q.value = o.q || 1;
      if (o.lpEnd) f.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur);
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(o.dest || sfxBus);
    if (o.send) g.connect(delay);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(t, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || "highpass"; f.frequency.value = o.freq || 6000; f.Q.value = o.q || 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.vol == null ? 0.1 : o.vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  function kick(t, vol, dest) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.frequency.setValueAtTime(150, t); osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g); g.connect(dest || musicBus); osc.start(t); osc.stop(t + 0.35);
  }

  function playStep(i, t) {
    const s = i % 16, bar = Math.floor(i / 16) % 4;
    const [root, tones] = theme.prog[bar];
    const game = mode === "game", lv = intensity, soft = theme.soft;
    // batterie
    if (game) {
      if (s % 4 === 0) kick(t, soft ? 0.35 : 0.55);
      if (!soft && (lv >= 2 || theme.big) && (s === 14 || s === 7)) kick(t, 0.3);
      if (s === 4 || s === 12) { noise(t, 0.18, { ftype: "bandpass", freq: 1800, vol: soft ? 0.12 : 0.3, dest: musicBus }); }
      if (s % 2 === 0 && !soft) noise(t, 0.04, { freq: 8000, vol: s % 4 === 2 ? 0.09 : 0.04, dest: musicBus });
      else if (soft && s % 4 === 2) noise(t, 0.05, { freq: 8000, vol: 0.05, dest: musicBus });
      else if (theme.big || lv >= 3) noise(t, 0.03, { freq: 9000, vol: 0.03, dest: musicBus });
    } else {
      if (s === 0 || s === 10) kick(t, 0.32);
      if (s % 4 === 2) noise(t, 0.03, { freq: 9000, vol: 0.03, dest: musicBus });
    }
    // basse
    const hits = game && !soft ? [0, 3, 6, 8, 10, 11, 14] : [0, 6, 8, 14];
    if (hits.includes(s)) {
      const oct = s === 6 || s === 14 ? 12 : 0;
      tone(mtof(root + oct), t, STEP * 1.7, { type: "sawtooth", vol: soft ? 0.08 : 0.15, lp: soft ? 500 : 900, lpEnd: 200, q: 6, dest: musicBus });
      tone(mtof(root - 12 + oct), t, STEP * 1.7, { type: "sine", vol: 0.22, dest: musicBus });
    }
    // nappe
    if (s === 0) tones.slice(0, 3).forEach((m, k) => tone(mtof(m), t, STEP * 15, { type: "sawtooth", vol: soft ? 0.035 : 0.028, attack: 0.3, lp: game ? 1600 : 1100, detune: k * 4 - 4, dest: musicBus }));
    // arpège
    const fast = game && (lv >= 1 || theme.big);
    if (s % 2 === 0 || fast) {
      const idx = ARP[(s >> (fast ? 0 : 1)) % ARP.length];
      const m = tones[idx] + 12 + (theme.big ? 12 : 0);
      tone(mtof(m), t, STEP * 0.9, { type: theme.wave === "sawtooth" ? "square" : theme.wave, vol: game ? 0.045 : 0.035, lp: 2600 + lv * 400, dest: musicBus, send: true });
    }
    // mélodie
    if (game && theme.lead) {
      const li = LEAD[i % 32];
      if (li >= 0) tone(mtof(tones[li] + 12), t, STEP * 2.2, { type: theme.big ? "square" : "triangle", vol: theme.big ? 0.05 : 0.08, lp: 3500, dest: musicBus, send: true });
    }
  }
  function scheduler() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.12) { playStep(step, nextTime); nextTime += STEP; step++; }
    timer = setTimeout(scheduler, 25);
  }
  function startMusic() {
    if (!ctx || playing || !musicOn) return;
    playing = true; nextTime = ctx.currentTime + 0.06; step = 0; scheduler();
  }
  function stopMusic() { playing = false; clearTimeout(timer); }
  function useTheme(name) {
    if (!THEMES[name]) return;
    theme = THEMES[name];
    STEP = 60 / theme.bpm / 4;
    if (ctx) delay.delayTime.setTargetAtTime(STEP * 3, ctx.currentTime, 0.05);
    step = 0;
  }

  const now = () => ctx.currentTime + 0.005;
  const sfx = {
    click() { tone(1400, now(), 0.05, { type: "triangle", vol: 0.12 }); },
    jump() { const t = now(); tone(320, t, 0.16, { type: "triangle", vol: 0.14, slide: 900 }); noise(t, 0.1, { freq: 3000, vol: 0.05 }); },
    land(combo) { const t = now(); const n = 72 + PENTA[Math.min(PENTA.length - 1, combo)]; tone(mtof(n), t, 0.12, { type: "square", vol: 0.1, lp: 4000 }); tone(mtof(n + 12), t + 0.035, 0.1, { type: "triangle", vol: 0.07 }); },
    perfect(combo) { const t = now(); const b = 79 + Math.min(combo, 8) * 2; [0, 4, 7, 12].forEach((n, k) => tone(mtof(b + n), t + k * 0.04, 0.16, { type: "square", vol: 0.07, lp: 5000 })); },
    tick(p) { const t = now(); tone(900 + (p || 0) * 1400, t, 0.05, { type: "square", vol: 0.07 + (p || 0) * 0.06 }); },
    edge() { tone(mtof(67), now(), 0.12, { type: "triangle", vol: 0.1 }); },
    crack() { const t = now(); noise(t, 0.25, { ftype: "bandpass", freq: 2500, vol: 0.2 }); tone(500, t, 0.2, { type: "sawtooth", vol: 0.08, slide: 120, lp: 2000 }); },
    fail() { const t = now(); tone(220, t, 0.4, { type: "sawtooth", vol: 0.2, slide: 55, lp: 1400 }); noise(t, 0.3, { ftype: "lowpass", freq: 900, vol: 0.22 }); },
    gameOver() { const t = now(); [67, 63, 60, 55].forEach((n, k) => tone(mtof(n), t + k * 0.18, 0.3, { type: "sawtooth", vol: 0.09, lp: 1500 })); },
    record() { const t = now(); [79, 84, 88, 91, 96].forEach((n, k) => tone(mtof(n), t + k * 0.06, 0.25, { type: "triangle", vol: 0.1 })); },
    milestone() {
      // effet spécial des 1000 points : montée + impact + scintillements
      const t = now();
      tone(200, t, 0.7, { type: "sawtooth", vol: 0.1, slide: 1600, lp: 3000 });
      noise(t, 0.7, { freq: 1500, vol: 0.08 });
      kick(t + 0.7, 0.7, sfxBus);
      noise(t + 0.7, 1.2, { freq: 5000, vol: 0.14 });
      [72, 76, 79, 84, 88].forEach((n) => tone(mtof(n), t + 0.7, 1.1, { type: "sawtooth", vol: 0.045, lp: 4000, attack: 0.01 }));
      for (let k = 0; k < 12; k++) tone(mtof(96 + PENTA[k % 6]), t + 0.85 + k * 0.06, 0.12, { type: "sine", vol: 0.05 });
    },
    firework() { noise(now(), 0.5, { ftype: "lowpass", freq: 1200 + Math.random() * 800, vol: 0.1 }); },
  };

  window.VZAudio = {
    store, THEMES,
    resume,
    play(n, a) { if (!ctx || !sfxOn || !sfx[n]) return; try { sfx[n](a); } catch (e) { /* ignore */ } },
    startMusic() { resume(); startMusic(); },
    // joue un fichier son (ex : assets/sounds/1000.mp3) ; sinon le son intégré
    playFile(url, fallback) {
      if (!sfxOn) return;
      const fb = () => window.VZAudio.play(fallback);
      try { const a = new Audio(url); a.volume = Math.min(1, sfxVol); a.addEventListener("error", fb, { once: true }); const p = a.play(); if (p && p.catch) p.catch(() => {}); }
      catch (e) { fb(); }
    },
    stopMusic,
    setMode(m, lv) { mode = m; intensity = lv || 0; },
    duck(on) { duckAmt = on ? 0.3 : 1; applyGains(); },
    // thème choisi par le joueur
    get baseTheme() { return baseTheme; },
    setBaseTheme(n) { if (!THEMES[n]) return; baseTheme = n; store.set("vzj_theme", n); useTheme(n); },
    // thème temporaire (ex : « viral » à 1000 points)
    useTheme, resetTheme() { useTheme(baseTheme); },
    get musicOn() { return musicOn; }, get sfxOn() { return sfxOn; },
    get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; },
    setMusicVol(v) { musicVol = v; store.set("vzj_mvol", v); applyGains(); },
    setSfxVol(v) { sfxVol = v; store.set("vzj_svol", v); applyGains(); },
    toggleMusic() {
      musicOn = !musicOn; store.set("vzj_music", musicOn); applyGains();
      if (ctx) { if (musicOn) startMusic(); else setTimeout(() => { if (!musicOn) stopMusic(); }, 300); }
      return musicOn;
    },
    toggleSfx() { sfxOn = !sfxOn; store.set("vzj_sfx", sfxOn); applyGains(); return sfxOn; },
  };
  // la musique s'arrête quand on quitte l'onglet, et reprend au retour
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === "running") ctx.suspend(); }
    else if (ctx.state === "suspended") ctx.resume();
  });
  window.addEventListener("pagehide", () => { if (ctx && ctx.state === "running") ctx.suspend(); });
})();
