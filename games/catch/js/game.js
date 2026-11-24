/* =========================================================
   PLAY WITH VIZEA — moteur de jeu
   ========================================================= */
(function () {
  "use strict";

  const A = window.VZAudio;
  const D = window.VZData;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const C = { green: "#1ed760", greenD: "#15b34f", ink: "#1c1d1f", bg: "#0b0c0d", yellow: "#fcff45", red: "#ff3b5c", white: "#ffffff" };
  const FONT = '"Dexperdy", "Space Grotesk", system-ui, sans-serif';
  const UIFONT = '"Space Grotesk", "Inter", system-ui, sans-serif';

  const app = $("#app");
  const cv = $("#game"), ctx = cv.getContext("2d");
  const fxc = $("#fx"), fx = fxc.getContext("2d");

  // logo (on découpe le carré « Z » de gauche dans le logo officiel haute définition)
  const logoImg = new Image();
  logoImg.src = "assets/img/logo-vizea.png";

  // ---------- canvas sizing ----------
  let W = 0, H = 0, DPR = 1, R = 24, bgCache = null;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    [cv, fxc].forEach((c) => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.max(19, Math.min(30, Math.min(W, H) * 0.036));
    buildSprites();
    buildBackground();
    player.w = Math.max(84, Math.min(150, W * 0.16));
    player.y = H - Math.max(46, H * 0.085) - 22;
    player.x = Math.min(Math.max(player.x || W / 2, player.w / 2), W - player.w / 2);
    player.tx = player.x;
  }

  // ---------- background ----------
  function buildBackground() {
    bgCache = document.createElement("canvas");
    bgCache.width = Math.round(W * DPR); bgCache.height = Math.round(H * DPR);
    const b = bgCache.getContext("2d");
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = b.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0e1011"); g.addColorStop(1, "#08090a");
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // grille
    b.strokeStyle = "rgba(255,255,255,0.035)"; b.lineWidth = 1;
    const step = Math.max(48, Math.min(W, H) / 12);
    for (let x = (W % step) / 2; x < W; x += step) { b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, H); b.stroke(); }
    for (let y = 0; y < H; y += step) { b.beginPath(); b.moveTo(0, y + 0.5); b.lineTo(W, y + 0.5); b.stroke(); }
    // croix aux intersections
    b.fillStyle = "rgba(30,215,96,0.12)";
    for (let x = (W % step) / 2; x < W; x += step * 3) for (let y = 0; y < H; y += step * 3) { b.fillRect(x - 3, y, 7, 1); b.fillRect(x, y - 3, 1, 7); }
    // vignette
    const v = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.6)");
    b.fillStyle = v; b.fillRect(0, 0, W, H);
  }

  function drawBackground(t) {
    ctx.drawImage(bgCache, 0, 0, W, H);
    // halos animés
    const blobs = [
      [W * (0.25 + 0.1 * Math.sin(t * 0.21)), H * (0.3 + 0.08 * Math.cos(t * 0.17)), Math.max(W, H) * 0.45, "rgba(30,215,96,0.10)"],
      [W * (0.78 + 0.08 * Math.cos(t * 0.15)), H * (0.7 + 0.1 * Math.sin(t * 0.19)), Math.max(W, H) * 0.4, state.boostT > 0 ? "rgba(252,255,69,0.10)" : "rgba(30,215,96,0.07)"],
    ];
    ctx.globalCompositeOperation = "lighter";
    blobs.forEach(([x, y, r, c]) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    ctx.globalCompositeOperation = "source-over";
    // grand texte de fond
    const label = state.mode === "home" || state.mode === "howto" ? "ViZea" : String(state.level + 1).padStart(2, "0");
    ctx.save();
    ctx.font = `800 ${Math.min(W * 0.42, H * 0.6)}px ${FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    ctx.fillText(label, W / 2, H * 0.55);
    ctx.restore();
  }

  // ---------- sprites ----------
  const sprites = {};
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function heartPath(c, s) {
    c.beginPath();
    c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.85, 0, -s * 0.38);
    c.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.25, 0, s * 0.35);
    c.closePath();
  }
  function starPath(c, ro, ri, n) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? ri : ro, a = (i * Math.PI) / n - Math.PI / 2;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
  }
  function text(c, s, size, color, weight) {
    c.font = `${weight || 800} ${size}px ${FONT}`;
    c.fillStyle = color; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(s, 0, size * 0.06);
  }

  // dessine l'icône centrée en (0,0) de rayon r
  function drawIcon(c, kind, type, r) {
    const glow = kind === "good" ? C.green : kind === "bad" ? C.red : C.yellow;
    c.save();
    c.shadowColor = glow; c.shadowBlur = r * 0.7;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2);
    if (kind === "good") { c.fillStyle = C.green; c.fill(); }
    else if (kind === "bad") { c.fillStyle = "#1a0d10"; c.fill(); c.shadowBlur = r * 0.5; c.lineWidth = r * 0.13; c.strokeStyle = C.red; c.stroke(); }
    else { c.fillStyle = C.yellow; c.fill(); }
    c.restore();
    // reflet
    c.save();
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
    const hl = c.createLinearGradient(0, -r, 0, r);
    hl.addColorStop(0, "rgba(255,255,255,0.28)"); hl.addColorStop(0.5, "rgba(255,255,255,0)");
    c.fillStyle = hl; c.fillRect(-r, -r, r * 2, r * 2);
    c.restore();

    const ink = kind === "bad" ? C.red : C.ink;
    c.save();
    c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = "round"; c.lineJoin = "round";
    const s = r;
    switch (type) {
      case "heart": c.translate(0, s * 0.08); heartPath(c, s * 0.95); c.fill(); break;
      case "idea":
        c.lineWidth = s * 0.13;
        c.beginPath(); c.arc(0, -s * 0.14, s * 0.36, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.16, s * 0.2); c.lineTo(-s * 0.16, s * 0.3); c.moveTo(s * 0.16, s * 0.2); c.lineTo(s * 0.16, s * 0.3); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.18, s * 0.42); c.lineTo(s * 0.18, s * 0.42); c.stroke();
        c.beginPath(); c.arc(0, -s * 0.14, s * 0.1, 0, Math.PI * 2); c.fill();
        break;
      case "hash": text(c, "#", s * 1.15, ink); break;
      case "chart":
        [[-0.36, 0.2], [-0.06, -0.05], [0.24, -0.3]].forEach(([x, h]) => { roundRect(c, x * s, h * s, s * 0.22, (0.42 - h) * s, s * 0.05); c.fill(); });
        c.lineWidth = s * 0.09;
        c.beginPath(); c.moveTo(-s * 0.4, -s * 0.05); c.lineTo(-s * 0.05, -s * 0.32); c.lineTo(s * 0.1, -s * 0.2); c.lineTo(s * 0.38, -s * 0.48); c.stroke();
        break;
      case "play": c.beginPath(); c.moveTo(-s * 0.22, -s * 0.38); c.lineTo(s * 0.42, 0); c.lineTo(-s * 0.22, s * 0.38); c.closePath(); c.lineWidth = s * 0.08; c.fill(); c.stroke(); break;
      case "star": starPath(c, s * 0.55, s * 0.24, 5); c.fill(); break;
      case "e404": text(c, "404", s * 0.62, ink); break;
      case "spam": text(c, "SPAM", s * 0.46, ink); break;
      case "fake": text(c, "FAKE", s * 0.46, ink); break;
      case "buzz":
        c.translate(0, s * 0.06); heartPath(c, s * 0.85); c.fill();
        c.strokeStyle = "#1a0d10"; c.lineWidth = s * 0.1;
        c.beginPath(); c.moveTo(0, -s * 0.36); c.lineTo(-s * 0.1, -s * 0.12); c.lineTo(s * 0.08, 0); c.lineTo(-s * 0.04, s * 0.3); c.stroke();
        break;
      case "viral": text(c, "x2", s * 0.8, ink); break;
      case "shield":
        c.beginPath(); c.moveTo(0, -s * 0.5); c.lineTo(s * 0.4, -s * 0.34); c.quadraticCurveTo(s * 0.38, s * 0.3, 0, s * 0.52); c.quadraticCurveTo(-s * 0.38, s * 0.3, -s * 0.4, -s * 0.34); c.closePath(); c.fill();
        c.strokeStyle = C.yellow; c.lineWidth = s * 0.1; c.beginPath(); c.moveTo(-s * 0.15, 0); c.lineTo(-s * 0.02, s * 0.13); c.lineTo(s * 0.18, -s * 0.12); c.stroke();
        break;
      case "magnet":
        c.lineWidth = s * 0.2; c.lineCap = "butt";
        c.beginPath(); c.arc(0, -s * 0.02, s * 0.3, Math.PI, 0, true); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.3, -s * 0.02); c.lineTo(-s * 0.3, -s * 0.38); c.moveTo(s * 0.3, -s * 0.02); c.lineTo(s * 0.3, -s * 0.38); c.stroke();
        c.strokeStyle = C.yellow; c.lineWidth = s * 0.06;
        c.beginPath(); c.moveTo(-s * 0.42, -s * 0.27); c.lineTo(-s * 0.18, -s * 0.27); c.moveTo(s * 0.18, -s * 0.27); c.lineTo(s * 0.42, -s * 0.27); c.stroke();
        break;
      case "life":
        c.translate(-s * 0.06, s * 0.06); heartPath(c, s * 0.8); c.fill();
        c.strokeStyle = C.yellow; c.lineWidth = s * 0.09;
        c.beginPath(); c.moveTo(-s * 0.14, -s * 0.06); c.lineTo(s * 0.14, -s * 0.06); c.moveTo(0, -s * 0.2); c.lineTo(0, s * 0.08); c.stroke();
        break;
    }
    c.restore();
  }

  function makeSprite(kind, type, r) {
    const pad = r * 0.9, size = Math.ceil((r + pad) * 2);
    const s = document.createElement("canvas");
    s.width = Math.ceil(size * DPR); s.height = Math.ceil(size * DPR);
    const c = s.getContext("2d");
    c.setTransform(DPR, 0, 0, DPR, size * DPR / 2, size * DPR / 2);
    drawIcon(c, kind, type, r);
    return { img: s, size };
  }
  function buildSprites() {
    ["good", "bad", "power"].forEach((kind) => Object.keys(D[kind]).forEach((t) => { sprites[t] = makeSprite(kind, t, R); }));
  }

  // ---------- légende (DOM) ----------
  function buildLegend(el, levelIdx) {
    el.innerHTML = "";
    const add = (kind, type, label, sub) => {
      const d = document.createElement("div");
      d.className = "lg " + (kind === "power" ? "pu" : kind);
      const c = document.createElement("canvas");
      const px = 44, dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = px * dpr; c.height = px * dpr;
      const g = c.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, px * dpr / 2, px * dpr / 2);
      drawIcon(g, kind, type, 15);
      d.appendChild(c);
      d.insertAdjacentHTML("beforeend", `<span>${label}</span><b>${sub}</b>`);
      el.appendChild(d);
    };
    const title = (t) => { const h = document.createElement("div"); h.className = "legend-title"; h.textContent = t; el.appendChild(h); };
    title("À ATTRAPER");
    Object.entries(D.good).forEach(([k, v]) => add("good", k, v.label, "+" + v.pts));
    title("À ÉVITER");
    Object.entries(D.bad).forEach(([k, v]) => add("bad", k, v.label, "−1 vie"));
    title("BONUS");
    Object.entries(D.power).forEach(([k, v]) => add("power", k, v.label, v.dur ? v.dur + " s" : "vie"));
  }

  // ---------- state ----------
  const player = { x: 0, tx: 0, y: 0, w: 120, h: 24, vx: 0, tilt: 0, squash: 0 };
  const state = {
    mode: "home", level: 0, score: 0, levelScore: 0, lives: 3, timeLeft: 60,
    combo: 0, bestCombo: 0, caught: 0, missed: 0, hits: 0, quizGood: 0, quizTotal: 0,
    spawnT: 0, items: [], parts: [], floats: [], shake: 0, t: 0,
    boostT: 0, shieldT: 0, magnetT: 0, lastSec: 0, recordBeatenShown: false,
    best: A.store.get("pwv_best", 0), quizPool: [], startBest: 0,
  };
  const keys = { left: false, right: false };
  const MAX_LIVES = 5;

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");
  function pickWeighted(obj, favor) {
    const entries = Object.entries(obj).map(([k, v]) => [k, (v.w || 1) * (favor && favor.includes(k) ? 1.8 : 1)]);
    let total = entries.reduce((s, e) => s + e[1], 0), r = Math.random() * total;
    for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
    return entries[0][0];
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const mult = () => Math.min(5, 1 + Math.floor(state.combo / 6));

  // ---------- spawning ----------
  function spawn(attract) {
    const L = D.levels[state.level];
    let kind, type;
    const r = Math.random();
    if (attract) { kind = r < 0.7 ? "good" : r < 0.85 ? "bad" : "power"; }
    else if (r < L.pu && state.mode === "play") kind = "power";
    else if (r < L.pu + L.bad) kind = "bad";
    else kind = "good";
    if (kind === "good") type = pickWeighted(D.good, L.favor);
    else if (kind === "bad") type = Object.keys(D.bad)[(Math.random() * 4) | 0];
    else {
      type = pickWeighted(D.power);
      if (type === "life" && state.lives >= MAX_LIVES) type = "viral";
    }
    const sp = attract ? rand(0.08, 0.16) : rand(L.speed[0], L.speed[1]);
    state.items.push({
      kind, type,
      x: rand(R + 8, W - R - 8), y: -R * 1.5,
      vy: sp * H, baseX: 0,
      sway: attract ? 0 : L.sway * (kind === "bad" ? 1.2 : 1) * rand(0.5, 1) * R * 2.2,
      ph: Math.random() * Math.PI * 2, rot: rand(-0.4, 0.4), vr: rand(-1, 1),
      born: state.t, scale: 0,
    });
    const it = state.items[state.items.length - 1];
    it.baseX = it.x;
  }

  // ---------- particles ----------
  function burst(x, y, color, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rand(80, 340) * (power || 1);
      state.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: rand(0.4, 0.9), max: 0.9, size: rand(2, 5), color, sq: Math.random() < 0.4 });
    }
  }
  function floatText(x, y, txt, color, big) {
    state.floats.push({ x, y, txt, color, life: 1, big: !!big });
  }

  // ---------- HUD ----------
  const hud = {
    score: $("#hud-score"), best: $("#hud-best"), lvl: $("#hud-lvl"), lvlname: $("#hud-lvlname"),
    prog: $("#hud-progress"), goal: $("#hud-goal"), time: $("#hud-time"), lives: $("#hud-lives"), pu: $("#powerups"),
  };
  const HEART_SVG = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>';
  function renderLives() {
    hud.lives.innerHTML = "";
    const n = Math.max(3, state.lives);
    for (let i = 0; i < n; i++) {
      hud.lives.insertAdjacentHTML("beforeend", HEART_SVG);
      if (i >= state.lives) hud.lives.lastChild.classList.add("lost");
    }
  }
  let lastScoreShown = -1;
  function updateHud() {
    if (lastScoreShown !== state.score) {
      hud.score.textContent = fmt(state.score);
      hud.score.classList.remove("bump"); void hud.score.offsetWidth; hud.score.classList.add("bump");
      lastScoreShown = state.score;
    }
    hud.best.textContent = fmt(Math.max(state.best, state.score));
    const L = D.levels[state.level];
    hud.prog.style.transform = `scaleX(${Math.min(1, state.levelScore / L.target)})`;
    hud.goal.textContent = `${fmt(Math.min(state.levelScore, L.target))} / ${fmt(L.target)}`;
    const sec = Math.max(0, Math.ceil(state.timeLeft));
    hud.time.textContent = sec;
    hud.time.classList.toggle("warn", sec <= 10);
    // power-ups
    const active = [["boostT", "viral", "VIRAL x2", "×2"], ["shieldT", "shield", "BOUCLIER", "◆"], ["magnetT", "magnet", "AIMANT", "U"]];
    active.forEach(([key, type, label, ic]) => {
      let chip = hud.pu.querySelector(`[data-pu="${type}"]`);
      if (state[key] > 0) {
        if (!chip) {
          chip = document.createElement("div"); chip.className = "pu-chip"; chip.dataset.pu = type;
          chip.innerHTML = `<span class="ic">${ic}</span>${label}<i></i>`;
          hud.pu.appendChild(chip);
        }
        chip.querySelector("i").style.transform = `scaleX(${state[key] / D.power[type].dur})`;
      } else if (chip) chip.remove();
    });
  }
  function setLevelHud() {
    const L = D.levels[state.level];
    hud.lvl.textContent = "NIV " + (state.level + 1);
    hud.lvlname.textContent = L.name;
    renderLives();
    lastScoreShown = -1;
    updateHud();
  }

  // combo display
  const comboEl = $("#combo"), comboV = $("#combo-v");
  let comboHideT = null;
  function showCombo() {
    const m = mult();
    if (m < 2) { comboEl.classList.remove("show"); return; }
    comboV.textContent = "x" + m;
    comboEl.classList.add("show");
    comboEl.classList.remove("hit"); void comboEl.offsetWidth; comboEl.classList.add("hit");
    clearTimeout(comboHideT);
    comboHideT = setTimeout(() => comboEl.classList.remove("show"), 1600);
  }

  const toastEl = $("#toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("go"); void toastEl.offsetWidth; toastEl.classList.add("go");
  }
  const flashEl = $("#flash");
  function flash(gold) {
    flashEl.classList.toggle("gold", !!gold);
    flashEl.classList.remove("go"); void flashEl.offsetWidth; flashEl.classList.add("go");
  }

  // ---------- screens ----------
  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + id));
  }
  function setMode(m) {
    state.mode = m;
    app.className = "";
    if (m === "home" || m === "howto") app.classList.add("is-home");
    if (m === "play" || m === "countdown") app.classList.add("is-play");
    if (["play", "countdown", "paused", "clear"].includes(m)) app.classList.add("show-hud");
  }

  function goHome() {
    stopFx();
    setMode("home");
    state.items = []; state.parts = []; state.floats = [];
    $("#home-best").textContent = fmt(state.best);
    show("home");
    A.setMode("menu", 0);
    A.duck(false);
    comboEl.classList.remove("show");
  }

  function newGame() {
    stopFx();
    Object.assign(state, {
      level: 0, score: 0, levelScore: 0, lives: 3, combo: 0, bestCombo: 0, caught: 0, missed: 0, hits: 0,
      quizGood: 0, quizTotal: 0, items: [], parts: [], floats: [], boostT: 0, shieldT: 0, magnetT: 0,
      recordBeatenShown: false, startBest: state.best,
      quizPool: shuffle(D.quiz.slice()),
    });
    hud.pu.innerHTML = "";
    showBrief();
  }

  function showBrief() {
    const L = D.levels[state.level];
    setMode("brief");
    state.items = [];
    $("#brief-num").textContent = String(state.level + 1).padStart(2, "0");
    $("#brief-title").textContent = L.name;
    $("#brief-text").textContent = L.brief;
    $("#brief-target").textContent = fmt(L.target) + " pts";
    $("#brief-time").textContent = L.time + " s";
    $("#brief-diff").textContent = "●".repeat(state.level + 1) + "○".repeat(4 - state.level);
    buildLegend($("#legend-brief"), state.level);
    show("brief");
    A.setMode("menu", 0);
    A.duck(false);
  }

  const cdEl = $("#countdown");
  let cdTimers = [];
  function startLevel() {
    const L = D.levels[state.level];
    state.levelScore = 0; state.timeLeft = L.time; state.combo = 0; state.spawnT = 0.6;
    state.items = []; state.boostT = state.shieldT = state.magnetT = 0;
    state.lastSec = L.time;
    hud.pu.innerHTML = "";
    show(null);
    setMode("countdown");
    setLevelHud();
    A.setMode("game", state.level);
    const seq = ["3", "2", "1", "GO!"];
    cdTimers.forEach(clearTimeout); cdTimers = [];
    seq.forEach((s, i) => cdTimers.push(setTimeout(() => {
      cdEl.innerHTML = `<span class="${s === "GO!" ? "go" : ""}">${s}</span>`;
      A.play("count", s === "GO!");
      if (s === "GO!") setMode("play");
    }, i * 650)));
    cdTimers.push(setTimeout(() => { cdEl.innerHTML = ""; }, seq.length * 650 + 300));
  }

  function pause() {
    if (state.mode !== "play") return;
    setMode("paused");
    show("pause");
    A.duck(true);
  }
  function resume() {
    if (state.mode !== "paused") return;
    show(null);
    setMode("play");
    A.duck(false);
  }

  function levelClear() {
    setMode("clear");
    A.play("levelUp");
    flash(true);
    burst(W / 2, H / 2, C.green, 60, 1.6);
    burst(W / 2, H / 2, C.yellow, 30, 1.2);
    const timeBonus = Math.ceil(state.timeLeft) * 10;
    state.score += timeBonus;
    checkRecordLive();
    state.items.forEach((it) => burst(it.x, it.y, it.kind === "bad" ? C.red : C.green, 6));
    state.items = [];
    comboEl.classList.remove("show");
    const isLast = state.level === D.levels.length - 1;
    setTimeout(() => {
      if (isLast) { victory(); return; }
      $("#clear-num").textContent = String(state.level + 1).padStart(2, "0");
      $("#clear-title").textContent = ["Marque lancée !", "Trafic en feu !", "Campagne au top !", "Clap de fin réussi !"][state.level] || "Objectif atteint !";
      $("#clear-stats").innerHTML = statHtml([
        [fmt(state.score), "SCORE"], ["+" + fmt(timeBonus), "BONUS TEMPS"], ["x" + Math.min(5, 1 + Math.floor(state.bestCombo / 6)), "MEILLEUR COMBO"],
      ]);
      show("clear");
      A.setMode("menu", 0);
    }, 900);
  }
  function statHtml(arr) { return arr.map(([v, k]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join(""); }

  // ---------- quiz ----------
  let quiz = null;
  const quizCard = $(".card-quiz");
  function startQuiz() {
    quiz = { idx: 0, bonus: 0, good: 0, qs: state.quizPool.splice(0, 3), timer: 0, locked: false, raf: 0 };
    if (quiz.qs.length < 3) { state.quizPool = shuffle(D.quiz.slice()); quiz.qs = state.quizPool.splice(0, 3); }
    setMode("quiz");
    quizCard.classList.remove("done");
    $("#quiz-bonus").textContent = "0";
    show("quiz");
    A.duck(true);
    nextQuestion();
  }
  const QTIME = 12;
  function nextQuestion() {
    const [q, answers] = quiz.qs[quiz.idx];
    $("#quiz-idx").textContent = quiz.idx + 1;
    $("#quiz-q").textContent = q;
    const order = shuffle(answers.map((a, i) => ({ a, ok: i === 0 })));
    const box = $("#quiz-answers");
    box.innerHTML = "";
    order.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "answer";
      b.innerHTML = `<span class="k">${"ABCD"[i]}</span><span></span>`;
      b.lastChild.textContent = o.a;
      b.dataset.ok = o.ok ? "1" : "";
      b.addEventListener("click", () => answer(b));
      box.appendChild(b);
    });
    quiz.locked = false;
    quiz.start = performance.now();
    cancelAnimationFrame(quiz.raf);
    const bar = $("#quiz-timer");
    let lastTick = QTIME;
    const loop = () => {
      const el = (performance.now() - quiz.start) / 1000;
      const left = Math.max(0, QTIME - el);
      bar.style.transform = `scaleX(${left / QTIME})`;
      bar.style.background = left < 4 ? C.red : C.yellow;
      if (Math.ceil(left) < lastTick && left < 4 && left > 0) { lastTick = Math.ceil(left); A.play("tick"); }
      if (left <= 0) { answer(null); return; }
      if (!quiz.locked) quiz.raf = requestAnimationFrame(loop);
    };
    quiz.raf = requestAnimationFrame(loop);
  }
  function answer(btn) {
    if (quiz.locked) return;
    quiz.locked = true;
    cancelAnimationFrame(quiz.raf);
    const left = Math.max(0, QTIME - (performance.now() - quiz.start) / 1000);
    const btns = $$("#quiz-answers .answer");
    btns.forEach((b) => { b.disabled = true; if (b.dataset.ok) b.classList.add("good"); else if (b !== btn) b.classList.add("dim"); });
    state.quizTotal++;
    if (btn && btn.dataset.ok) {
      const pts = 100 * (state.level + 1) + Math.round(left * 10);
      quiz.bonus += pts; quiz.good++; state.quizGood++;
      $("#quiz-bonus").textContent = fmt(quiz.bonus);
      A.play("correct");
    } else {
      if (btn) btn.classList.add("bad");
      A.play("wrong");
    }
    setTimeout(() => {
      quiz.idx++;
      if (quiz.idx < quiz.qs.length) nextQuestion();
      else endQuiz();
    }, 1250);
  }
  function endQuiz() {
    state.score += quiz.bonus;
    checkRecordLive();
    if (quiz.good === 3) { state.lives = Math.min(MAX_LIVES, state.lives + 1); }
    $("#quiz-summary").innerHTML = `<b style="color:#fff">${quiz.good}/3</b> bonnes réponses · <b style="color:#1ed760">+${fmt(quiz.bonus)} pts</b>` +
      (quiz.good === 3 ? `<br>Sans faute ! <b style="color:#fcff45">+1 budget</b> offert.` : "");
    quizCard.classList.add("done");
    if (quiz.good >= 2) A.play("levelUp");
  }

  // ---------- end states ----------
  function saveRecord() {
    const isNew = state.score > state.startBest && state.score > 0;
    if (state.score > state.best) { state.best = state.score; A.store.set("pwv_best", state.best); }
    return isNew;
  }
  function checkRecordLive() {
    if (!state.recordBeatenShown && state.startBest > 0 && state.score > state.startBest) {
      state.recordBeatenShown = true;
      toast("🏆 NOUVEAU RECORD !");
      A.play("record");
    }
  }

  function gameOver(reason) {
    setMode("over");
    state.boostT = state.shieldT = state.magnetT = 0;
    A.play("gameOver");
    A.setMode("menu", 0);
    comboEl.classList.remove("show");
    const isNew = saveRecord();
    $("#over-reason").textContent = reason === "time" ? "⏱ DEADLINE DÉPASSÉE" : "💸 BUDGET ÉPUISÉ";
    $("#over-score").textContent = fmt(state.score);
    $("#over-record").classList.toggle("show", isNew);
    $("#over-stats").innerHTML = statHtml([
      [`${state.level + 1}/5`, "CAMPAGNE"], [fmt(state.caught), "IDÉES CAPTÉES"], [fmt(state.best), "RECORD"],
    ]);
    setTimeout(() => show("over"), 700);
    if (isNew) setTimeout(() => A.play("record"), 1300);
  }

  function victory() {
    setMode("win");
    state.boostT = state.shieldT = state.magnetT = 0;
    const lifeBonus = state.lives * 300;
    state.score += lifeBonus;
    const isNew = saveRecord();
    A.stopMusic();
    A.play("victory");
    $("#win-record").classList.toggle("show", isNew);
    $("#win-stats").innerHTML = statHtml([
      [fmt(state.caught), "IDÉES CAPTÉES"], ["x" + Math.min(5, 1 + Math.floor(state.bestCombo / 6)), "MEILLEUR COMBO"],
      [`${state.quizGood}/${state.quizTotal}`, "QUIZ"], ["+" + fmt(lifeBonus), "BONUS BUDGET"],
    ]);
    $("#win-score").textContent = "0";
    show("win");
    startFx();
    // count-up
    const target = state.score, t0 = performance.now() + 1100, dur = 1800;
    const up = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - p, 3);
      $("#win-score").textContent = fmt(target * e);
      if (p < 1 && state.mode === "win") requestAnimationFrame(up);
    };
    requestAnimationFrame(up);
    setTimeout(() => { if (state.mode === "win") { A.setMode("menu", 0); A.startMusic(); } }, 4200);
    if (isNew) setTimeout(() => A.play("record"), 2600);
  }

  // ---------- victory FX (confettis + feux d'artifice) ----------
  let fxRun = false, fxParts = [], fxStart = 0, fxNextFw = 0;
  const FX_COLORS = [C.green, C.yellow, C.white, "#7dffb0", C.green];
  function startFx() {
    fxRun = true; fxParts = []; fxStart = performance.now(); fxNextFw = 0;
    for (let i = 0; i < 160; i++) confetti(rand(0, W), rand(-H, 0), rand(-40, 40), rand(60, 200));
    // canons latéraux
    for (let i = 0; i < 90; i++) {
      confetti(0, H * 0.75, rand(300, 900), rand(-1100, -500));
      confetti(W, H * 0.75, -rand(300, 900), rand(-1100, -500));
    }
  }
  function stopFx() { fxRun = false; fxParts = []; fx.clearRect(0, 0, W, H); }
  function confetti(x, y, vx, vy) {
    fxParts.push({ t: "c", x, y, vx, vy, rot: rand(0, 6), vr: rand(-10, 10), w: rand(6, 12), h: rand(3, 6), color: FX_COLORS[(Math.random() * FX_COLORS.length) | 0], life: rand(4, 7), ph: rand(0, 6) });
  }
  function firework() {
    const x = rand(W * 0.15, W * 0.85), y = rand(H * 0.12, H * 0.45);
    const col = FX_COLORS[(Math.random() * 3) | 0];
    const n = 60;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, s = rand(180, 320);
      fxParts.push({ t: "f", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(1, 1.5), max: 1.5, color: col, px: x, py: y });
    }
    A.play("firework");
  }
  function updateFx(dt, now) {
    if (!fxRun) return;
    fx.clearRect(0, 0, W, H);
    const el = (now - fxStart) / 1000;
    if (el < 9 && now > fxNextFw) { firework(); fxNextFw = now + rand(350, 800); }
    if (el < 7 && Math.random() < 0.5) confetti(rand(0, W), -10, rand(-30, 30), rand(80, 180));
    for (let i = fxParts.length - 1; i >= 0; i--) {
      const p = fxParts[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) { fxParts.splice(i, 1); continue; }
      if (p.t === "c") {
        p.vx *= 0.985; p.vy = Math.min(p.vy + 520 * dt, 240); p.vy *= p.vy < 0 ? 0.985 : 1;
        p.x += (p.vx + Math.sin(el * 3 + p.ph) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.scale(1, Math.cos(el * 6 + p.ph));
        fx.globalAlpha = Math.min(1, p.life); fx.fillStyle = p.color; fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        fx.restore();
      } else {
        p.px = p.x; p.py = p.y;
        p.vx *= 0.96; p.vy = p.vy * 0.96 + 140 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        fx.globalAlpha = Math.max(0, p.life / p.max);
        fx.strokeStyle = p.color; fx.lineWidth = 2.5; fx.lineCap = "round";
        fx.beginPath(); fx.moveTo(p.px, p.py); fx.lineTo(p.x, p.y); fx.stroke();
        fx.globalAlpha = 1;
      }
    }
    if (el > 12 && fxParts.length === 0) fxRun = false;
  }

  // ---------- gameplay update ----------
  function catchItem(it) {
    const px = it.x, py = it.y;
    if (it.kind === "good") {
      state.combo++; state.caught++;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const before = mult();
      const pts = D.good[it.type].pts * mult() * (state.boostT > 0 ? 2 : 1);
      state.score += pts; state.levelScore += pts;
      floatText(px, py - R, "+" + pts, it.type === "star" ? C.yellow : C.green, it.type === "star");
      burst(px, py, it.type === "star" ? C.yellow : C.green, it.type === "star" ? 26 : 14);
      if (it.type === "star") A.play("star"); else A.play("catch", state.combo);
      if (state.combo % 6 === 0 && mult() > 1) { A.play("combo", mult()); }
      if (mult() !== before || mult() > 1) showCombo();
      player.squash = 1;
      checkRecordLive();
    } else if (it.kind === "bad") {
      if (state.shieldT > 0) {
        A.play("shield");
        burst(px, py, C.yellow, 18);
        floatText(px, py - R, "BLOQUÉ !", C.yellow);
        return;
      }
      state.lives--; state.hits++; state.combo = 0;
      comboEl.classList.remove("show");
      renderLives();
      A.play("bad");
      flash(false);
      state.shake = 14;
      app.classList.remove("shake"); void app.offsetWidth; app.classList.add("shake");
      burst(px, py, C.red, 26, 1.2);
      floatText(px, py - R, D.bad[it.type].label.toUpperCase(), C.red, true);
      if (navigator.vibrate) try { navigator.vibrate(120); } catch (e) { /* */ }
      if (state.lives <= 0) gameOver("budget");
    } else {
      const P = D.power[it.type];
      A.play("power");
      burst(px, py, C.yellow, 30, 1.3);
      flash(true);
      if (it.type === "viral") state.boostT = P.dur;
      if (it.type === "shield") state.shieldT = P.dur;
      if (it.type === "magnet") state.magnetT = P.dur;
      if (it.type === "life") { state.lives = Math.min(MAX_LIVES, state.lives + 1); renderLives(); }
      toast(P.label.toUpperCase() + " !");
    }
  }

  function update(dt) {
    state.t += dt;
    const playing = state.mode === "play";
    const attract = state.mode === "home" || state.mode === "howto";

    // joueur
    if (playing || state.mode === "countdown") {
      const kSpeed = W * 1.5;
      if (keys.left) player.tx -= kSpeed * dt;
      if (keys.right) player.tx += kSpeed * dt;
      player.tx = Math.min(Math.max(player.tx, player.w / 2 + 6), W - player.w / 2 - 6);
      const prev = player.x;
      player.x += (player.tx - player.x) * Math.min(1, dt * 18);
      player.vx = (player.x - prev) / Math.max(dt, 1e-4);
      player.tilt += (Math.max(-0.25, Math.min(0.25, player.vx / 4000)) - player.tilt) * Math.min(1, dt * 10);
    }
    player.squash = Math.max(0, player.squash - dt * 5);

    if (playing) {
      const L = D.levels[state.level];
      state.timeLeft -= dt;
      const sec = Math.ceil(state.timeLeft);
      if (sec < state.lastSec) { state.lastSec = sec; if (sec <= 5 && sec > 0) A.play("tick"); }
      state.boostT = Math.max(0, state.boostT - dt);
      state.shieldT = Math.max(0, state.shieldT - dt);
      state.magnetT = Math.max(0, state.magnetT - dt);
      // accélération progressive au sein du niveau
      const ramp = 1 + 0.25 * (1 - state.timeLeft / L.time);
      state.spawnT -= dt * ramp;
      if (state.spawnT <= 0) {
        spawn(false);
        state.spawnT = L.spawn * rand(0.75, 1.25);
      }
      if (state.levelScore >= L.target) { levelClear(); }
      else if (state.timeLeft <= 0) { state.timeLeft = 0; gameOver("time"); }
    } else if (attract) {
      state.spawnT -= dt;
      if (state.spawnT <= 0) { spawn(true); state.spawnT = rand(0.35, 0.7); }
    }

    // objets
    const catchTop = player.y - player.h * 0.5, catchBottom = player.y + player.h;
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.scale = Math.min(1, it.scale + dt * 5);
      if (playing || attract) {
        it.y += it.vy * dt;
        it.ph += dt * 2.4;
        it.baseX += 0;
        it.x = it.baseX + Math.sin(it.ph) * it.sway;
        if (it.sway) it.x = Math.min(Math.max(it.x, R), W - R);
        it.rot += it.vr * dt * 0.6;
        if (playing && state.magnetT > 0 && it.kind !== "bad" && it.y > H * 0.25) {
          const dx = player.x - it.baseX;
          it.baseX += dx * Math.min(1, dt * 4.5);
        }
      }
      if (playing && it.y + R >= catchTop && it.y - R <= catchBottom && Math.abs(it.x - player.x) <= player.w / 2 + R * 0.55) {
        state.items.splice(i, 1);
        catchItem(it);
        if (state.mode !== "play") break;
        continue;
      }
      if (it.y - R > H) {
        state.items.splice(i, 1);
        if (playing && it.kind === "good") {
          state.missed++;
          if (state.combo >= 6) floatText(it.x, H - 40, "COMBO PERDU", "rgba(255,255,255,.6)");
          state.combo = 0;
          comboEl.classList.remove("show");
        }
      }
    }

    // particules
    for (let i = state.parts.length - 1; i >= 0; i--) {
      const p = state.parts[i];
      p.life -= dt;
      if (p.life <= 0) { state.parts.splice(i, 1); continue; }
      p.vy += 600 * dt; p.vx *= 0.98;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = state.floats.length - 1; i >= 0; i--) {
      const f = state.floats[i];
      f.life -= dt * 1.1; f.y -= dt * 70;
      if (f.life <= 0) state.floats.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 40);

    if (playing || state.mode === "countdown") updateHud();
  }

  // ---------- render ----------
  function drawPlayer() {
    const { x, y, w, h } = player;
    const sq = player.squash;
    ctx.save();
    ctx.translate(x, y + h / 2);
    ctx.rotate(player.tilt);
    ctx.scale(1 + sq * 0.08, 1 - sq * 0.18);

    // bouclier
    if (state.shieldT > 0) {
      const a = state.shieldT < 2 ? (Math.sin(state.t * 20) > 0 ? 0.9 : 0.3) : 0.9;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.shadowColor = C.yellow; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.2, w * 0.68, h * 3.2, 0, Math.PI, 0); ctx.stroke();
      ctx.globalAlpha = a * 0.12; ctx.fillStyle = C.yellow; ctx.fill();
      ctx.restore();
    }
    // aimant
    if (state.magnetT > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(252,255,69,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -state.t * 60;
      ctx.beginPath(); ctx.arc(0, 0, w * 0.9 + Math.sin(state.t * 6) * 6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.restore();
    }

    // corps
    const glow = state.boostT > 0 ? C.yellow : C.green;
    ctx.shadowColor = glow; ctx.shadowBlur = 26;
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = C.ink; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5; ctx.strokeStyle = glow; ctx.stroke();
    // bande lumineuse
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "rgba(30,215,96,0)"); g.addColorStop(0.5, state.boostT > 0 ? "rgba(252,255,69,.9)" : "rgba(30,215,96,.9)"); g.addColorStop(1, "rgba(30,215,96,0)");
    ctx.fillStyle = g; ctx.fillRect(-w / 2 + 10, -h / 2 + 1, w - 20, 2.5);

    // badge Z (logo ViZea)
    const s = h * 2.05;
    ctx.save();
    ctx.translate(0, h * 0.05);
    ctx.shadowColor = glow; ctx.shadowBlur = 18;
    roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.24);
    ctx.fillStyle = "#111"; ctx.fill();
    ctx.shadowBlur = 0;
    if (logoImg.complete && logoImg.naturalWidth) {
      ctx.save(); roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.24); ctx.clip();
      ctx.drawImage(logoImg, 0, 0, 338, 338, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.15)";
    roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.24); ctx.stroke();
    ctx.restore();
    ctx.restore();

    // ombre au sol
    ctx.save();
    const sh = ctx.createRadialGradient(x, y + h + 14, 0, x, y + h + 14, w * 0.7);
    sh.addColorStop(0, "rgba(30,215,96,0.22)"); sh.addColorStop(1, "rgba(30,215,96,0)");
    ctx.fillStyle = sh; ctx.fillRect(x - w, y + h, w * 2, 30);
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    drawBackground(state.t);

    // ligne de sol
    const inGame = !["home", "howto", "win"].includes(state.mode);
    if (inGame) {
      const gy = player.y + player.h + 10;
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, "rgba(30,215,96,0)"); lg.addColorStop(0.5, "rgba(30,215,96,0.35)"); lg.addColorStop(1, "rgba(30,215,96,0)");
      ctx.fillStyle = lg; ctx.fillRect(0, gy, W, 1);
    }

    // objets
    for (const it of state.items) {
      const sp = sprites[it.type];
      if (!sp) continue;
      const sc = it.scale * (it.kind === "power" ? 1 + Math.sin(state.t * 8) * 0.06 : 1);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.kind === "bad" ? Math.sin(it.ph * 2) * 0.15 : it.rot * 0.3);
      ctx.scale(sc, sc);
      if (state.mode === "home" || state.mode === "howto") ctx.globalAlpha = 0.55;
      ctx.drawImage(sp.img, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
      if (it.kind === "power") {
        ctx.strokeStyle = "rgba(252,255,69,.7)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.rotate(state.t * 2);
        ctx.beginPath(); ctx.arc(0, 0, R * 1.32, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    if (inGame) drawPlayer();

    // particules
    for (const p of state.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.sq) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // textes flottants
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 1.6);
      const size = f.big ? 26 : 20;
      ctx.font = `800 ${size * (1 + (1 - f.life) * 0.15)}px ${FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.6)";
      ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // vignette « viral »
    if (state.boostT > 0 && state.mode === "play") {
      ctx.strokeStyle = `rgba(252,255,69,${0.25 + Math.sin(state.t * 8) * 0.1})`;
      ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
    }
    ctx.restore();
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    updateFx(dt, now);
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  function pointerMove(e) {
    if (state.mode !== "play" && state.mode !== "countdown") return;
    player.tx = e.clientX;
  }
  cv.addEventListener("pointerdown", (e) => { pointerMove(e); });
  window.addEventListener("pointermove", pointerMove, { passive: true });
  cv.addEventListener("touchmove", (e) => { if (state.mode === "play") e.preventDefault(); }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A" || k === "q" || k === "Q") keys.left = true;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = true;
    if ((k === "p" || k === "P" || k === "Escape") && !e.repeat) {
      if (state.mode === "play") pause(); else if (state.mode === "paused") resume();
    }
    if ((k === "m" || k === "M") && !e.repeat) toggleMusic();
    if ((k === "s" || k === "S") && !e.repeat) toggleSfx();
    if ((k === "Enter" || k === " ") && !e.repeat) {
      if (state.mode === "home") { e.preventDefault(); $("#btn-play").click(); }
      else if (state.mode === "brief") { e.preventDefault(); $("#btn-start-level").click(); }
    }
    if (["ArrowLeft", "ArrowRight", " "].includes(k) && state.mode === "play") e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A" || k === "q" || k === "Q") keys.left = false;
    if (k === "ArrowRight" || k === "d" || k === "D") keys.right = false;
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && location.hash !== "#debug") pause(); });
  window.addEventListener("blur", () => { keys.left = keys.right = false; });
  window.addEventListener("resize", resize);

  // ---------- sound toggles ----------
  const bMusic = $("#btn-music"), bSfx = $("#btn-sfx");
  function syncToggles() {
    bMusic.classList.toggle("off", !A.musicOn);
    bSfx.classList.toggle("off", !A.sfxOn);
    bMusic.setAttribute("aria-pressed", A.musicOn);
    bSfx.setAttribute("aria-pressed", A.sfxOn);
  }
  function toggleMusic() { A.resume(); A.toggleMusic(); syncToggles(); A.play("click"); }
  function toggleSfx() { A.resume(); A.toggleSfx(); syncToggles(); A.play("click"); }
  bMusic.addEventListener("click", (e) => { e.currentTarget.blur(); toggleMusic(); });
  bSfx.addEventListener("click", (e) => { e.currentTarget.blur(); toggleSfx(); });
  syncToggles();

  // ---------- buttons ----------
  function unlockAudio() { A.resume(); A.startMusic(); }
  $("#btn-play").addEventListener("click", () => { unlockAudio(); A.play("click"); newGame(); });
  $("#btn-howto").addEventListener("click", () => { unlockAudio(); A.play("click"); setMode("howto"); buildLegend($("#legend-howto")); show("howto"); });
  $("#btn-start-level").addEventListener("click", () => { unlockAudio(); A.play("click"); startLevel(); });
  $("#btn-to-quiz").addEventListener("click", () => { A.play("click"); startQuiz(); });
  $("#btn-next-level").addEventListener("click", () => {
    A.play("click");
    state.level++;
    showBrief();
  });
  $("#btn-pause").addEventListener("click", (e) => { e.currentTarget.blur(); A.play("click"); pause(); });
  $("#btn-resume").addEventListener("click", () => { A.play("click"); resume(); });
  $$("[data-action]").forEach((b) => b.addEventListener("click", () => {
    unlockAudio();
    A.play("click");
    cdTimers.forEach(clearTimeout); cdEl.innerHTML = "";
    if (b.dataset.action === "home") goHome();
    if (b.dataset.action === "restart") newGame();
  }));
  $$(".btn, .btn-play, .answer").forEach((b) => b.addEventListener("pointerenter", () => A.play("hover")));
  // premier geste n'importe où = autorise l'audio
  window.addEventListener("pointerdown", function once() { unlockAudio(); window.removeEventListener("pointerdown", once); });

  // ---------- debug (uniquement avec #debug dans l'URL) ----------
  if (location.hash === "#debug") {
    window.__pwv = { state, player, step(sec) { for (let i = 0; i < sec * 60; i++) update(1 / 60); render(); }, setMode, levelClear, victory, gameOver };
  }

  // ---------- boot ----------
  resize();
  goHome();
  requestAnimationFrame(frame);
  const hideLoader = () => $("#loader").classList.add("hide");
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { buildSprites(); setTimeout(hideLoader, 250); });
  setTimeout(hideLoader, 2500);
})();
