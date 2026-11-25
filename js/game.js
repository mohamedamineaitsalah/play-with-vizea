/* =========================================================
   ViZea Jump — saute de cercle en cercle (style « orbit »)
   ========================================================= */
(function () {
  "use strict";
  const A = window.VZAudio, st = A.store;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const C = { green: "#1ed760", yellow: "#fcff45", gold: "#f2cf1d", ink: "#1c1d1f", red: "#ff3b5c" };
  const FONT = '"Dexperdy", "Space Grotesk", system-ui, sans-serif';
  const MAX_COMBO = 8;
  const MILESTONES = [1000, 2000, 3000, 5000, 10000];
  const RANK_MIN = [0, 200, 500, 1000, 2000, 3500];
  const MAX_LIVES = 1;
  const L10N = window.VZI18N;
  let lang = A.store.get("vzj_lang", null);
  if (!L10N[lang]) { const nl = (navigator.language || "fr").toLowerCase(); lang = nl.startsWith("ar") ? "ar" : nl.startsWith("en") ? "en" : "fr"; }
  const T = () => L10N[lang];
  const t = (k, vars) => { let v = T()[k]; if (typeof v !== "string") return v; if (vars) Object.keys(vars).forEach((x) => (v = v.split("{" + x + "}").join(vars[x]))); return v; };

  const app = $("#app");
  const cv = $("#game"), ctx = cv.getContext("2d");
  const fxc = $("#fx"), fx = fxc.getContext("2d");
  const logo = new Image();
  logo.src = "assets/img/logo-vizea.png";
  let redZ = null;
  function buildRedZ() {
    redZ = document.createElement("canvas"); redZ.width = redZ.height = 256;
    const r = redZ.getContext("2d");
    r.drawImage(logo, 0, 0, 338, 338, 0, 0, 256, 256);
    r.globalCompositeOperation = "source-atop";
    r.fillStyle = "rgba(255,40,70,0.88)"; r.fillRect(0, 0, 256, 256);
  }
  logo.onload = () => { buildBg(); buildRedZ(); };
  // Image de fond personnalisée (facultative) : déposer assets/img/background.jpg
  const customBg = new Image();
  let hasCustomBg = false;
  customBg.onload = () => { hasCustomBg = true; buildBg(); };
  customBg.src = "assets/img/background.jpg";

  let W = 0, H = 0, DPR = 1, colW = 400, offX = 0, U = 1, bg = null;
  const rand = (a, b) => a + Math.random() * (b - a);
  const fmt = (n) => Math.round(n).toLocaleString("fr-FR");

  // ---------- fond ViZea ----------
  function buildBg() {
    if (!W) return;
    bg = document.createElement("canvas");
    bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR);
    const b = bg.getContext("2d");
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    b.fillStyle = "#070809"; b.fillRect(0, 0, W, H);
    if (hasCustomBg) {
      const s = Math.max(W / customBg.width, H / customBg.height);
      const iw = customBg.width * s, ih = customBg.height * s;
      b.drawImage(customBg, (W - iw) / 2, (H - ih) / 2, iw, ih);
      b.fillStyle = "rgba(5,8,6,0.5)"; b.fillRect(0, 0, W, H);
    } else {
      const g = b.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.75);
      g.addColorStop(0, "rgba(30,215,96,0.28)"); g.addColorStop(0.45, "rgba(30,215,96,0.07)"); g.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = g; b.fillRect(0, 0, W, H);
      // faisceaux diagonaux (les traits du Z)
      b.save(); b.translate(W / 2, H / 2); b.rotate(-Math.PI / 4);
      const L = Math.hypot(W, H);
      [[-0.2, 0.09, 0.22], [0.02, 0.06, 0.16], [0.26, 0.035, 0.1], [-0.42, 0.02, 0.08]].forEach(([o, w, a]) => {
        const y = o * Math.min(W, H) * 1.3, th = w * Math.min(W, H);
        const lg = b.createLinearGradient(-L / 2, 0, L / 2, 0);
        lg.addColorStop(0, "rgba(30,215,96,0)"); lg.addColorStop(0.5, `rgba(30,215,96,${a})`); lg.addColorStop(1, "rgba(30,215,96,0)");
        b.fillStyle = lg; b.fillRect(-L / 2, y - th / 2, L, th);
      });
      b.restore();
      // « ViZea » vertical
      [[0.1, -1, "rgba(255,255,255,0.06)"], [0.9, 1, "rgba(30,215,96,0.08)"]].forEach(([x, dir, col]) => {
        b.save();
        b.font = `800 ${Math.min(H * 0.32, W * 0.5)}px ${FONT}`;
        b.textAlign = "center"; b.textBaseline = "middle"; b.lineWidth = 2; b.strokeStyle = col;
        b.translate(W * x, H / 2); b.rotate((dir * Math.PI) / 2); b.strokeText("ViZea", 0, 0);
        b.restore();
      });
      // grand Z
      if (logo.complete && logo.naturalWidth) {
        const s = Math.min(W * 1.05, H * 0.75);
        b.save(); b.globalAlpha = 0.35; if ("filter" in b) b.filter = "blur(30px)";
        b.drawImage(logo, 0, 0, 338, 338, W / 2 - s / 2, H * 0.47 - s / 2, s, s); b.restore();
        b.save(); b.globalAlpha = 0.16;
        b.drawImage(logo, 0, 0, 338, 338, W / 2 - s / 2, H * 0.47 - s / 2, s, s); b.restore();
      }
    }
    b.strokeStyle = "rgba(255,255,255,0.03)"; b.lineWidth = 1;
    for (let x = 0; x < W; x += 44) { b.beginPath(); b.moveTo(x + 0.5, 0); b.lineTo(x + 0.5, H); b.stroke(); }
    for (let y = 0; y < H; y += 44) { b.beginPath(); b.moveTo(0, y + 0.5); b.lineTo(W, y + 0.5); b.stroke(); }
    const n = document.createElement("canvas"); n.width = n.height = 128;
    const nc = n.getContext("2d"), id = nc.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 14; }
    nc.putImageData(id, 0, 0);
    b.fillStyle = b.createPattern(n, "repeat"); b.fillRect(0, 0, W, H);
    const v = b.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.7)");
    b.fillStyle = v; b.fillRect(0, 0, W, H);
  }
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), d: rand(0.1, 0.6), s: rand(0.6, 2.2), g: Math.random() < 0.5 }));

  // ---------- état ----------
  const S = {
    mode: "home", circles: [], parts: [], floats: [], rings: [],
    ball: { x: 0, y: 0, state: "orbit", ci: 0, a: 0, vx: 0, vy: 0, p0x: 0, p0y: 0, trail: [], fall: 0, rot: 0, sq: 0, from: 0, lap: 0, lapA: 0, bounced: false },
    lives: MAX_LIVES, hazY: 0, camY: 0, score: 0, jumps: 0, combo: 1, bestCombo: 1, flyT: 0, t: 0, shake: 0, milestone: 0,
    best: st.get("vzj_best", 0), startBest: 0, recordShown: false, jumped: false, reason: "out",
  };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    [cv, fxc].forEach((c) => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const old = colW;
    colW = Math.min(W, 430); offX = (W - colW) / 2; U = colW / 400;
    buildBg();
    if (S.circles.length && old !== colW && S.mode !== "play") reset();
  }

  const diff = () => Math.min(1, S.score / 4000);
  function genCircle(prev, idx) {
    const d = diff();
    const r = colW * rand(0.125, 0.15) * (1 - d * 0.42);
    // plus tu joues bien (plus de points), plus il y a d'espace entre les cercles
    const gap = colW * (rand(0.005, 0.04) + d * rand(0.08, 0.2));
    const y = prev.y - (prev.r + r + gap);
    const m = colW * 0.04;
    let kind = "normal", amp = 0;
    if (idx > 8 && Math.random() < 0.14 + 0.28 * d) { kind = "move"; amp = colW * rand(0.07, 0.14); }
    else if (idx > 12 && Math.random() < 0.12 + 0.25 * d) kind = "fragile";
    const lo = m + r + amp, hi = colW - m - r - amp;
    let x = prev.baseX + (Math.random() < 0.5 ? -1 : 1) * colW * rand(0.1, 0.28);
    if (x < lo || x > hi) x = prev.baseX + (prev.baseX > colW / 2 ? -1 : 1) * colW * rand(0.1, 0.26);
    x = Math.min(hi, Math.max(lo, x));
    return {
      x, baseX: x, y, r, kind, amp, ph: Math.random() * 6.28, ms: rand(0.9, 1.5) * (1 + d),
      w: (3.4 + 2.6 * d) * rand(0.92, 1.08) * (Math.random() < 0.5 ? -1 : 1),
      pulse: 0, life: 1, lifeMax: rand(2.4, 1.6) - d * 0.4, broken: false, idx,
    };
  }
  function ensureCircles() {
    while (S.circles.length < Math.max(S.ball.ci, S.maxCi || 0) + 10) S.circles.push(genCircle(S.circles[S.circles.length - 1], S.circles.length));
  }
  function reset() {
    S.circles = []; S.parts = []; S.floats = []; S.rings = [];
    S.score = 0; S.jumps = 0; S.combo = 0; S.bestCombo = 0; S.milestone = 0; S.lives = MAX_LIVES; S.maxCi = 0;
    S.circles.push({ x: colW / 2, baseX: colW / 2, y: 0, r: colW * 0.15, kind: "normal", amp: 0, ph: 0, ms: 0, w: 3.4, pulse: 0, life: 1, lifeMax: 2, broken: false, idx: 0 });
    Object.assign(S.ball, { state: "orbit", ci: 0, a: -Math.PI * 0.15, trail: [], fall: 0, lap: 0, lapA: -Math.PI * 0.15, bounced: false });
    ensureCircles();
    S.camY = S.circles[0].y - H * 0.64;
    S.hazY = S.camY + H + 40;
    S.recordShown = false; S.jumped = false; S.startBest = S.best;
    placeBall();
  }
  function placeBall() {
    const c = S.circles[S.ball.ci];
    S.ball.x = c.x + Math.cos(S.ball.a) * c.r;
    S.ball.y = c.y + Math.sin(S.ball.a) * c.r;
  }
  const ballR = () => colW * 0.028;

  // ---------- voix (synthèse vocale du navigateur) ----------
  const Voice = {
    on: st.get("vzj_voice", true),
    name: st.get("vzj_voice_name", ""),
    list: [],
    load() {
      if (!("speechSynthesis" in window)) return;
      const all = speechSynthesis.getVoices();
      const re = T().voiceLang;
      const mine = all.filter((v) => re.test(v.lang));
      const FEMALE = /(female|femme|woman|hortense|julie|denise|eloise|vivienne|amelie|am\u00e9lie|audrey|marie|zira|aria|jenny|michelle|samantha|karen|susan|hazel|libby|sonia|emma|hoda|salma|zariyah|mouna|amina|laila|layla|google fran|google us english|google uk english female)/i;
      const list = mine.length ? mine : all;
      this.list = list.filter((v) => FEMALE.test(v.name)).concat(list.filter((v) => !FEMALE.test(v.name)));
      fillVoices();
    },
    say(text) {
      return; // voix du commentateur supprimée (à la demande)
      if (!this.on || !("speechSynthesis" in window)) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = this.list.find((x) => x.name === this.name) || this.list[0];
        if (v && T().voiceLang.test(v.lang)) { u.voice = v; u.lang = v.lang; } else u.lang = T().speechLang;
        u.rate = 1.02; u.pitch = 1.15; u.volume = Math.max(0.2, A.sfxVol);
        speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    },
  };
  let vibe = st.get("vzj_vibe", true);
  const buzz = (ms) => { if (vibe && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* */ } };

  // ---------- actions ----------
  function jump() {
    if (S.mode !== "play" || S.ball.state !== "orbit") return;
    const c = S.circles[S.ball.ci], s = Math.sign(c.w);
    const tx = -Math.sin(S.ball.a) * s, ty = Math.cos(S.ball.a) * s;
    // vitesse de vol calée sur la vidéo : glisse calme, constante
    const sp = colW * 0.6;
    Object.assign(S.ball, { state: "fly", vx: tx * sp, vy: ty * sp, p0x: S.ball.x, p0y: S.ball.y, sq: 1, from: S.ball.ci, bounced: false });
    S.flyT = 0; S.tickI = -1;
    A.play("jump");
    if (!S.jumped) { S.jumped = true; $("#hint").classList.remove("show"); }
  }

  function capture(j) {
    const b = S.ball, c = S.circles[j];
    const v = Math.hypot(b.vx, b.vy);
    const dc = Math.abs((c.x - b.p0x) * b.vy - (c.y - b.p0y) * b.vx) / v / c.r;
    const isNew = j > S.maxCi;
    const lower = !isNew;
    const n = isNew ? j - S.maxCi : 0;
    if (isNew) S.maxCi = j;
    // nouveau cercle : 10 points x combo (x8 = 80 max) ; cercle déjà visité : 0 point et combo remis à zéro
    const good = isNew;
    if (good) { S.combo = Math.min(MAX_COMBO, S.combo + 1); comboPop(t("comboPop", { n: S.combo })); }
    else { if (S.combo > 1) comboPop(t("comboLost"), true); S.combo = 0; }
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    // 10 points x combo : x0/x1 = 10, x2 = 20 ... x8 = 80 (sauter un cercle ne multiplie pas les points)
    let pts = n > 0 ? 10 * Math.max(1, S.combo) : 0;
    const center = good && dc < 0.13;
    if (center) pts += 20;
    if (b.bounced && pts > 0) pts *= 2;
    pts = Math.min(pts, 360); // maximum absolu par saut : 360 points
    S.score += pts; S.jumps += n;
    b.a = Math.atan2(b.y - c.y, b.x - c.x);
    const s = Math.sign(-Math.sin(b.a) * b.vx + Math.cos(b.a) * b.vy) || 1;
    c.w = Math.abs(c.w) * s;
    b.ci = j; b.state = "orbit"; b.sq = -1; b.lap = 0; b.lapA = b.a;
    placeBall();
    c.pulse = 1;
    if (c.kind === "fragile") c.life = 1;
    S.rings.push({ x: c.x, y: c.y, r: c.r, life: 1, col: good ? C.yellow : "#fff" });
    burst(b.x, b.y, "#ffffff", good ? 16 : 8, 0.7, true);
    burst(b.x, b.y, C.gold, good ? 8 : 4, 0.6, true);
    S.floats.push({ x: c.x, y: c.y + c.r * 0.2, txt: "+" + pts, life: 1, color: "#fff", big: good });
    if (lower) streak(t("lower"));
    else if (b.bounced) streak(t("bounce"));
    else if (center) streak(t("center"));
    else if (n > 1) streak(t("double", { n }));
    b.bounced = false;
    if (good) A.play("perfect", S.combo); else A.play("edge");
    if (good && (S.combo % 10 === 0 || S.combo === 5)) Voice.say(S.combo === MAX_COMBO ? t("vComboMax") : t("vCombo", { n: S.combo }));
    ensureCircles();
    updateHud(true);
    checkMilestones();
    if (!S.recordShown && S.startBest > 0 && S.score > S.startBest) {
      S.recordShown = true; banner(t("recBanner"), fmt(S.score)); A.play("record"); Voice.say(t("vRecord"));
    }
  }

  function checkMilestones() {
    while (S.milestone < MILESTONES.length && S.score >= MILESTONES[S.milestone]) {
      const m = MILESTONES[S.milestone];
      S.milestone++;
      A.play("milestone"); // son intégré du jeu (sons personnalisés retirés)
      buzz([60, 40, 120]);
      if (m === 1000) {
        // 1000 points : effet spécial + changement de musique
        A.useTheme("viral");
        A.setMode("game", 4);
        banner(t("m1000a"), t("m1000b"));
        Voice.say(t("v1000"));
      } else {
        banner(t("mPts", { n: fmt(m) }), m === 2000 ? t("m2000") : m === 3000 ? t("m3000") : t("mLegend"));
        Voice.say(t("vPts", { n: fmt(m) }));
      }
      startFx(true);
      app.classList.add("viral");
    }
  }

  // Raté : on perd un cœur et on repart du cercle d'avant (la partie continue)
  function miss(reason) {
    if (S.mode !== "play") return;
    S.lives--;
    renderLives(true);
    if (S.lives > 0) A.play("fail");
    buzz(120);
    S.shake = 8;
    burst(S.ball.x, S.ball.y, C.red, 18, 1);
    if (S.lives <= 0) { S.lives = 0; die(reason); return; }
    const b = S.ball;
    const c = S.circles[b.state === "fly" ? b.from : b.ci];
    if (reason === "fragile") { c.kind = "normal"; c.broken = false; c.life = 1; toast("🔧 " + t("repaired")); }
    b.ci = S.circles.indexOf(c); b.state = "orbit"; b.trail = []; b.sq = -1;
    if (S.combo >= 3) comboPop(t("comboLost"), true);
    S.combo = 1; updateHud(false);
    banner(t("miss"), "❤".repeat(S.lives));
    Voice.say(t("vMiss"));
    placeBall();
    S.rings.push({ x: c.x, y: c.y, r: c.r, life: 1, col: C.red });
  }

  function die(reason) {
    if (S.mode !== "play") return;
    S.reason = reason;
    S.ball.state = "dead"; S.ball.fall = 0;
    S.mode = "dying";
    if (reason === "burst" || reason === "hazard") { burst(S.ball.x, S.ball.y, reason === "hazard" ? C.red : C.gold, 40, 1.6); S.ball.state = "gone"; }
    S.shake = 14;
    A.play("fail"); // son intégré du jeu (sons personnalisés retirés)
    A.play("crack");
    buzz(150);
    burst(S.ball.x, S.ball.y, C.red, 26, 1.2);
    setTimeout(gameOver, 900);
  }

  // ---------- fin de partie ----------
  function rankFor(score) { let i = 0; RANK_MIN.forEach((m, k) => { if (score >= m) i = k; }); return T().ranks[i]; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

  function gameOver() {
    S.mode = "over";
    app.className = "" + (lang === "ar" ? " rtl" : "");
    stopFx();
    const prevBest = S.startBest;
    const isNew = S.score > prevBest && S.score > 0;
    S.lastIsNew = isNew;
    if (S.score > S.best) { S.best = S.score; st.set("vzj_best", S.best); }
    // stats persistantes
    const days = st.get("vzj_days", []);
    if (!days.includes(today())) { days.push(today()); st.set("vzj_days", days.slice(-30)); }
    const played = st.get("vzj_played", 0) + 1; st.set("vzj_played", played);
    const xp = st.get("vzj_xp", 0) + Math.round(S.score / 10) + S.jumps; st.set("vzj_xp", xp);
    const bestCombo = Math.max(st.get("vzj_bcombo", 1), S.bestCombo); st.set("vzj_bcombo", bestCombo);

    $("#over-reason").textContent = t({ out: "reasonOut", fragile: "reasonFragile", burst: "reasonBurst", hazard: "reasonHazard" }[S.reason] || "reasonOut");
    $("#over-score").textContent = fmt(S.score);
    $("#over-rank").textContent = rankFor(S.score);
    $("#over-record").classList.toggle("show", isNew);
    $("#st-combo").textContent = "x" + S.bestCombo;
    $("#st-jumps").textContent = S.jumps;
    $("#st-best").textContent = fmt(S.best);
    const gl = $("#goal-line");
    if (isNew) gl.innerHTML = t("goalNew");
    else if (S.best > 0) gl.innerHTML = t("goalLeft", { n: fmt(S.best - S.score + 1) });
    else gl.textContent = t("goalFirst");
    $("#daily-txt").textContent = `${Math.min(10, days.length)}/10`;
    $("#lvl").textContent = 1 + Math.floor(xp / 500);
    $("#xp-txt").textContent = `${xp % 500} / 500 XP`;
    $("#games-played").textContent = T().played(played);
    $("#avg-line").textContent = t("bestComboAll", { n: bestCombo });
    const bars = { "#bar-record": S.best ? (S.score / S.best) * 100 : 0, "#bar-daily": (Math.min(10, days.length) / 10) * 100, "#bar-xp": ((xp % 500) / 500) * 100 };
    Object.keys(bars).forEach((k) => ($(k).style.width = "0%"));
    show("over");
    setTimeout(() => { prepareShare().catch(() => {}); }, 400); // prépare l'image du score
    requestAnimationFrame(() => requestAnimationFrame(() => Object.entries(bars).forEach(([k, v]) => ($(k).style.width = Math.min(100, v) + "%"))));
    A.play("gameOver");
    A.resetTheme();
    A.setMode("menu", 0);
    if (isNew) { setTimeout(() => A.play("record"), 800); Voice.say(t("vRecord") + " " + t("vHave", { n: fmt(S.score) })); }
    else Voice.say(t("vHave", { n: fmt(S.score) }));
  }

  // ---------- écrans ----------
  function show(id) { $$(".screen:not(.modal)").forEach((s) => s.classList.toggle("active", s.id === "screen-" + id)); }
  function openModal(id) { $("#screen-" + id).classList.add("active"); if (id === "settings") syncSettings(); A.duck(S.mode === "play"); if (S.mode === "play") S.paused = true; }
  function closeModals() { $$(".screen.modal").forEach((s) => s.classList.remove("active")); A.duck(false); S.paused = false; }

  function startGame() {
    stopFx();
    closeModals();
    reset();
    S.mode = "play";
    app.className = "is-play" + (lang === "ar" ? " rtl" : "");
    show(null);
    $("#hint").classList.add("show");
    A.resetTheme();
    A.setMode("game", 0);
    updateHud(false);
  }
  function goHome() {
    stopFx(); closeModals();
    S.mode = "home"; app.className = "is-home" + (lang === "ar" ? " rtl" : "");
    reset();
    $("#home-best").textContent = fmt(S.best);
    $("#home-level").textContent = 1 + Math.floor(st.get("vzj_xp", 0) / 500);
    $("#home-played").textContent = fmt(st.get("vzj_played", 0));
    $("#hint").classList.remove("show");
    show("home");
    A.resetTheme();
    A.setMode("menu", 0);
  }

  // ---------- HUD ----------
  const scoreEl = $("#score"), comboEl = $("#combo");
  function updateHud(bump) {
    scoreEl.textContent = fmt(S.score);
    if (bump) { scoreEl.classList.remove("bump"); void scoreEl.offsetWidth; scoreEl.classList.add("bump"); }
    comboEl.textContent = "x" + S.combo;
    if (!bump) renderLives(false);
    comboEl.classList.toggle("dim", S.combo <= 1);
    if (bump && S.combo > 1) { comboEl.classList.remove("pop"); void comboEl.offsetWidth; comboEl.classList.add("pop"); }
  }
  function renderLives(hit) {
    const el = $("#lives");
    el.innerHTML = "";
    for (let i = 0; i < MAX_LIVES; i++) {
      const h = document.createElement("i");
      h.textContent = "❤";
      if (i >= S.lives) h.className = "lost";
      if (hit && i === S.lives) h.className = "lost breaking";
      el.appendChild(h);
    }
  }
  function comboPop(txt, lost) {
    const el = $("#combo-pop");
    el.textContent = txt;
    el.className = "combo-pop" + (lost ? " lost" : "");
    void el.offsetWidth; el.classList.add("go");
  }
  function banner(small, big) {
    const el = $("#banner");
    el.innerHTML = "<small></small><b></b>";
    el.firstChild.textContent = small; el.lastChild.textContent = big;
    el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
  }
  function streak(txt) { const el = $("#streak"); el.textContent = txt; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); }
  let toastT = null;
  function toast(txt) { const el = $("#toast"); el.textContent = txt; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600); }

  // ---------- particules ----------
  function burst(x, y, color, n, pw, squares) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = rand(60, 240) * (pw || 1) * U;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.8), max: 0.8, size: rand(1.8, 4) * U, color, sq: !!squares });
    }
  }

  // ---------- update ----------
  function update(dt) {
    if (S.paused) return;
    S.t += dt;
    const b = S.ball;
    for (const c of S.circles) {
      if (c.amp) c.x = c.baseX + Math.sin(S.t * c.ms + c.ph) * c.amp;
      c.pulse = Math.max(0, c.pulse - dt * 3);
    }
    if (b.state === "orbit") {
      const c = S.circles[b.ci];
      b.a += c.w * dt;
      placeBall();
      if (S.mode === "play") {
        b.lap += Math.abs(c.w) * dt;
        if (b.lap >= Math.PI * 2) {
          // tour complet : la ligne jaune s'efface et le combo est perdu
          if (S.combo > 0) { comboPop(t("lapLost"), true); A.play("edge"); S.combo = 0; updateHud(false); }
          b.lap = 0; b.lapA = b.a;
        }
      }
      if (S.mode === "play" && c.kind === "fragile" && !c.broken) {
        c.life -= dt / c.lifeMax;
        if (c.life <= 0) {
          A.play("crack");
          burst(c.x, c.y, "#fff", 30, 1.2);
          miss("fragile");
        }
      }
    } else if (b.state === "fly") {
      b.x += b.vx * dt; b.y += b.vy * dt;
      S.flyT += dt;
      const brr = ballR();
      for (let j = 0; j < S.circles.length; j++) {
        if (j === b.from) continue;
        const c = S.circles[j];
        if (c.broken || c.y + c.r < S.camY - 200 || c.y - c.r > S.camY + H + 200) continue;
        if (Math.hypot(b.x - c.x, b.y - c.y) <= c.r + brr * 0.4) { capture(j); break; }
      }
      if (b.state === "fly") {
        const br = ballR();
        // rebond sur les bords : la balle continue sa route
        if (b.x < br && b.vx < 0) { b.x = br; b.vx = -b.vx; b.sq = 0.8; b.bounced = true; A.play("edge"); burst(b.x, b.y, C.gold, 8); }
        if (b.x > colW - br && b.vx > 0) { b.x = colW - br; b.vx = -b.vx; b.sq = 0.8; b.bounced = true; A.play("edge"); burst(b.x, b.y, C.gold, 8); }
        if (S.flyT > 1.2) {
          // avertissement : tic-tac de plus en plus rapide avant d'éclater
          const step = S.flyT > 2.4 ? 0.12 : S.flyT > 1.8 ? 0.2 : 0.3;
          const ti = Math.floor(S.flyT / step);
          if (ti !== S.tickI) { S.tickI = ti; A.play("tick", (S.flyT - 1.2) / 1.8); buzz(15); }
        }
        if (S.flyT > 3) miss("burst");
        else if (b.y + br > S.hazY + 14 * U) miss("hazard");
      }
    } else if (b.state === "dead") {
      b.fall += 1400 * U * dt; b.y += b.fall * dt;
    }
    if (b.state !== "dead" && b.state !== "gone") { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 18) b.trail.shift(); }
    // rotation de la balle : elle roule sur le cercle et tourbillonne en vol
    if (b.state === "fly") { b.rot += dt * 14 * Math.sign(b.vx || 1); if (Math.random() < 0.5) S.parts.push({ x: b.x + rand(-4, 4), y: b.y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-20, 20), life: 0.4, max: 0.4, size: rand(1.5, 3) * U, color: Math.random() < 0.5 ? C.gold : C.green }); }
    else if (b.state === "orbit") b.rot += S.circles[b.ci].w * dt * 3;
    b.sq += (0 - b.sq) * Math.min(1, dt * 8);
    let target = S.circles[b.ci].y - H * 0.6;
    if (b.state === "fly") target = Math.min(target, b.y - H * 0.45);
    if (S.mode === "home") S.camY = S.circles[0].y - H * 0.64;
    else S.camY += (target - S.camY) * Math.min(1, dt * (b.state === "fly" ? 6 : 4));
    // le Z rouge monte sans arrêt : lentement au début, plus vite quand les points augmentent
    if (S.mode === "home") S.hazY = S.camY + H + 120;
    else if (S.mode === "play") {
      S.hazY -= (16 + 44 * diff()) * U * dt;
      S.hazY = Math.min(S.hazY, S.camY + H - 26 * U);
      if (b.state === "orbit" && b.y + ballR() > S.hazY + 14 * U) miss("hazard");
    }
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const p = S.parts[i]; p.life -= dt;
      if (p.life <= 0) { S.parts.splice(i, 1); continue; }
      p.vy += 500 * U * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.life -= dt * 1.2; f.y -= 40 * dt; if (f.life <= 0) S.floats.splice(i, 1); }
    for (let i = S.rings.length - 1; i >= 0; i--) { const r = S.rings[i]; r.life -= dt * 2.2; r.r += 110 * U * dt; if (r.life <= 0) S.rings.splice(i, 1); }
    S.shake = Math.max(0, S.shake - dt * 40);
  }

  // ---------- rendu ----------
  function render() {
    ctx.direction = "ltr";
    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    for (const p of dust) {
      const y = (((p.y * H - S.camY * p.d) % H) + H) % H;
      ctx.globalAlpha = 0.2 + p.d * 0.6; ctx.fillStyle = p.g ? C.green : "#fff";
      ctx.beginPath(); ctx.arc(p.x * W, y, p.s, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (offX > 10) { ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(offX - 1, 0, 1, H); ctx.fillRect(offX + colW, 0, 1, H); }

    ctx.save();
    if (S.shake) ctx.translate(rand(-S.shake, S.shake), rand(-S.shake, S.shake));
    ctx.translate(offX, -S.camY);
    const b = S.ball, top = S.camY - 80, bot = S.camY + H + 80;

    for (let i = 0; i < S.circles.length; i++) {
      const c = S.circles[i];
      if (c.y + c.r < top || c.y - c.r > bot || c.broken) continue;
      const current = i === b.ci && b.state === "orbit";
      const passed = i < b.ci;
      ctx.save();
      ctx.globalAlpha = passed ? 0.28 : 1;
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.283);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
      ctx.lineWidth = 2.6 * U + c.pulse * 3;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      if (c.kind === "fragile") ctx.setLineDash([7 * U, 6 * U]);
      ctx.shadowColor = "rgba(255,255,255,.35)"; ctx.shadowBlur = 6;
      ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      if (current) {
        const ir = c.r - 6 * U;
        // repère faible + ligne jaune qui se dessine pendant que la balle tourne
        ctx.strokeStyle = "rgba(252,255,69,0.16)"; ctx.lineWidth = 3.2 * U;
        ctx.beginPath(); ctx.arc(c.x, c.y, ir, 0, 6.283); ctx.stroke();
        const sg = Math.sign(c.w) || 1;
        if (b.lap > 0.02) {
          ctx.strokeStyle = b.lap > Math.PI * 1.6 ? "#ffb347" : C.yellow; ctx.lineWidth = 3.6 * U; ctx.lineCap = "round";
          ctx.shadowColor = C.yellow; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(c.x, c.y, ir, b.lapA, b.lapA + sg * b.lap, sg < 0); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        if (c.kind === "fragile") {
          ctx.strokeStyle = "rgba(255,59,92,.9)"; ctx.lineWidth = 2.4 * U;
          ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 6 * U, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0, c.life)); ctx.stroke();
        }
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(c.x, c.y, 3.6 * U, 0, 6.283); ctx.fill();
      if (c.kind === "move") {
        ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `700 ${15 * U}px "Space Grotesk", sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("‹", c.x - c.r - 10 * U, c.y); ctx.fillText("›", c.x + c.r + 10 * U, c.y);
      }
      ctx.restore();
    }
    for (const r of S.rings) {
      ctx.globalAlpha = Math.max(0, r.life); ctx.strokeStyle = r.col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ligne de visée
    if (b.state === "orbit" && S.mode === "play") {
      const c = S.circles[b.ci], s = Math.sign(c.w);
      const tx = -Math.sin(b.a) * s, ty = Math.cos(b.a) * s;
      const len = colW * Math.max(0.25, 0.5 - S.score / 16000);
      const g = ctx.createLinearGradient(b.x, b.y, b.x + tx * len, b.y + ty * len);
      g.addColorStop(0, "rgba(242,207,29,.9)"); g.addColorStop(1, "rgba(242,207,29,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 2 * U; ctx.setLineDash([5 * U, 6 * U]); ctx.lineDashOffset = -S.t * 40;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + tx * len, b.y + ty * len); ctx.stroke();
      ctx.setLineDash([]);
    }
    // queue de comète dorée pendant le vol
    if (b.state === "fly") {
      const v = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / v, uy = b.vy / v;
      const L = colW * 0.12, w0 = ballR() * 0.9;
      const ex = b.x - ux * L, ey = b.y - uy * L;
      const g = ctx.createLinearGradient(b.x, b.y, ex, ey);
      g.addColorStop(0, "rgba(255,236,130,0.95)"); g.addColorStop(0.45, "rgba(242,190,29,0.6)"); g.addColorStop(1, "rgba(242,150,29,0)");
      ctx.save(); ctx.fillStyle = g; ctx.shadowColor = C.gold; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(b.x - uy * w0, b.y + ux * w0); ctx.lineTo(ex, ey); ctx.lineTo(b.x + uy * w0, b.y - ux * w0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (let i = 1; i < b.trail.length && b.state !== "fly"; i++) {
      const p = b.trail[i], q = b.trail[i - 1], k = i / b.trail.length;
      ctx.strokeStyle = `rgba(242,207,29,${k * 0.35})`; ctx.lineWidth = ballR() * 0.5 * k; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    // balle ViZea
    const br = ballR();
    const danger = b.state === "fly" && S.mode === "play" ? Math.min(1, Math.max(0, (S.flyT - 1.2) / 1.8)) : 0;
    ctx.save();
    ctx.translate(b.x + (danger ? rand(-1, 1) * danger * 5 * U : 0), b.y + (danger ? rand(-1, 1) * danger * 5 * U : 0));
    if (b.state === "gone") ctx.scale(0, 0);
    if (danger) { const sw = 1 + danger * 0.45 + Math.sin(S.t * (20 + danger * 40)) * 0.08 * danger; ctx.scale(sw, sw); }
    if (b.state === "fly") { const ang = Math.atan2(b.vy, b.vx); const st2 = 1 + Math.max(0, b.sq) * 0.08; ctx.rotate(ang); ctx.scale(st2, 1 / st2); ctx.rotate(-ang); }
    else if (b.sq < 0) { const p = 1 + b.sq * -0.3; ctx.scale(p, 1 / p); }
    const pulse = 1 + Math.sin(S.t * 6) * 0.04;
    ctx.scale(pulse, pulse);
    ctx.rotate(b.state === "dead" ? S.t * 8 : b.rot);
    ctx.shadowColor = C.gold; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.fillStyle = "#111"; ctx.fill();
    ctx.shadowBlur = 0;
    if (logo.complete && logo.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.clip();
      ctx.drawImage(logo, 20, 20, 298, 298, -br, -br, br * 2, br * 2); ctx.restore();
    }
    ctx.lineWidth = 2 * U; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.stroke();
    if (danger) {
      const blink = 0.5 + 0.5 * Math.sin(S.t * (14 + danger * 36));
      ctx.globalAlpha = danger * (0.45 + 0.4 * blink);
      ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.red; ctx.lineWidth = 3 * U; ctx.shadowColor = C.red; ctx.shadowBlur = 20 * danger;
      ctx.beginPath(); ctx.arc(0, 0, br + 4 * U + blink * 4 * U, 0, 6.283); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    if (danger) {
      // compte à rebours 3, 2, 1 au-dessus de la balle
      const left = Math.max(1, Math.ceil(3 - S.flyT));
      ctx.save();
      ctx.font = `800 ${(20 + danger * 12) * U}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.strokeText(String(left), b.x, b.y - br * 2.4);
      ctx.fillStyle = C.red; ctx.fillText(String(left), b.x, b.y - br * 2.4);
      ctx.restore();
    }

    // danger : Z rouge ViZea qui monte du bas
    if (S.mode !== "home" && S.hazY < S.camY + H + 40) {
      const hy = S.hazY;
      const g2 = ctx.createLinearGradient(0, hy - 30 * U, 0, hy + 140 * U);
      g2.addColorStop(0, "rgba(255,40,70,0)"); g2.addColorStop(0.25, "rgba(255,40,70,0.35)"); g2.addColorStop(1, "rgba(120,0,20,0.85)");
      ctx.fillStyle = g2; ctx.fillRect(-offX, hy - 30 * U, W, S.camY + H - hy + 60 * U);
      ctx.strokeStyle = "rgba(255,80,100,.9)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -offX; x <= colW + offX; x += 6) ctx.lineTo(x, hy + Math.sin(x * 0.05 + S.t * 4) * 4 * U);
      ctx.stroke();
      if (redZ) {
        const zs = 64 * U;
        for (let k = 0; k < 3; k++) {
          const zx = colW * (0.2 + k * 0.3), zy = hy + 18 * U + Math.sin(S.t * 3 + k) * 5 * U;
          ctx.save(); ctx.translate(zx, zy); ctx.rotate(Math.sin(S.t * 2 + k) * 0.15);
          ctx.shadowColor = C.red; ctx.shadowBlur = 24;
          ctx.drawImage(redZ, -zs / 2, -zs / 2, zs, zs);
          ctx.restore();
        }
      }
    }
    for (const p of S.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      if (p.sq) ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of S.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `300 ${(f.big ? 24 : 20) * U}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = f.color; ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 6;
      ctx.fillText(f.txt, f.x, f.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------- confettis / feux d'artifice ----------
  let fxRun = false, fxParts = [], fxStart = 0, fxNext = 0, fxShort = false;
  const FXC = [C.green, C.yellow, "#fff", "#7dffb0"];
  function confetti(x, y, vx, vy) { fxParts.push({ t: "c", x, y, vx, vy, rot: rand(0, 6), vr: rand(-10, 10), w: rand(6, 12), h: rand(3, 6), color: FXC[(Math.random() * 4) | 0], life: rand(3, 5), ph: rand(0, 6) }); }
  function startFx(short) {
    fxRun = true; fxShort = !!short; fxStart = performance.now(); fxNext = 0;
    for (let i = 0; i < 70; i++) { confetti(0, H * 0.7, rand(300, 900), rand(-1100, -500)); confetti(W, H * 0.7, -rand(300, 900), rand(-1100, -500)); }
  }
  function stopFx() { fxRun = false; fxParts = []; fx.clearRect(0, 0, W, H); }
  function firework() {
    const x = rand(W * 0.15, W * 0.85), y = rand(H * 0.12, H * 0.4), col = FXC[(Math.random() * 3) | 0];
    for (let i = 0; i < 50; i++) { const a = (i / 50) * 6.283, s = rand(160, 290); fxParts.push({ t: "f", x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(1, 1.4), max: 1.4, color: col }); }
    A.play("firework");
  }
  function updateFx(dt, now) {
    if (!fxRun) return;
    fx.clearRect(0, 0, W, H);
    const el = (now - fxStart) / 1000, dur = fxShort ? 2.2 : 8;
    if (el < dur && now > fxNext) { firework(); fxNext = now + rand(300, 650); }
    for (let i = fxParts.length - 1; i >= 0; i--) {
      const p = fxParts[i]; p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) { fxParts.splice(i, 1); continue; }
      if (p.t === "c") {
        p.vx *= 0.985; p.vy = Math.min(p.vy + 520 * dt, 240);
        p.x += (p.vx + Math.sin(el * 3 + p.ph) * 40) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.scale(1, Math.cos(el * 6 + p.ph));
        fx.globalAlpha = Math.min(1, p.life); fx.fillStyle = p.color; fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); fx.restore();
      } else {
        p.px = p.x; p.py = p.y; p.vx *= 0.96; p.vy = p.vy * 0.96 + 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        fx.globalAlpha = Math.max(0, p.life / p.max); fx.strokeStyle = p.color; fx.lineWidth = 2.5; fx.lineCap = "round";
        fx.beginPath(); fx.moveTo(p.px, p.py); fx.lineTo(p.x, p.y); fx.stroke(); fx.globalAlpha = 1;
      }
    }
    if (el > dur + 1 && !fxParts.length) { fxRun = false; fx.clearRect(0, 0, W, H); }
  }

  // ---------- boucle ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    update(dt); render(); updateFx(dt, now);
    requestAnimationFrame(frame);
  }

  // ---------- réglages ----------
  const swMusic = $("#sw-music"), swSfx = $("#sw-sfx"), swVoice = $("#sw-voice"), swVibe = $("#sw-vibe");
  const volM = $("#vol-music"), volS = $("#vol-sfx"), vSel = $("#voice-select");
  function fillVoices() {
    vSel.innerHTML = "";
    if (!Voice.list.length) { vSel.innerHTML = ""; const o = document.createElement("option"); o.textContent = t("defaultVoice"); vSel.appendChild(o); return; }
    Voice.list.forEach((v) => { const o = document.createElement("option"); o.value = v.name; o.textContent = `${v.name} (${v.lang})`; vSel.appendChild(o); });
    if (Voice.name && Voice.list.some((v) => v.name === Voice.name)) vSel.value = Voice.name;
  }
  function syncSettings() {
    swMusic.classList.toggle("on", A.musicOn); swMusic.setAttribute("aria-checked", A.musicOn);
    swSfx.classList.toggle("on", A.sfxOn); swSfx.setAttribute("aria-checked", A.sfxOn);
    swVoice.classList.toggle("on", Voice.on); swVoice.setAttribute("aria-checked", Voice.on);
    swVibe.classList.toggle("on", vibe); swVibe.setAttribute("aria-checked", vibe);
    volM.value = Math.round(A.musicVol * 100); volS.value = Math.round(A.sfxVol * 100);
    $$("#seg-theme button").forEach((b) => b.classList.toggle("on", b.dataset.theme === A.baseTheme));
    $("#btn-mute").classList.toggle("off", !A.musicOn && !A.sfxOn);
  }
  swMusic.addEventListener("click", () => { A.resume(); A.toggleMusic(); syncSettings(); });
  swSfx.addEventListener("click", () => { A.resume(); A.toggleSfx(); syncSettings(); A.play("click"); });
  swVoice.addEventListener("click", () => { Voice.on = !Voice.on; st.set("vzj_voice", Voice.on); syncSettings(); if (Voice.on) Voice.say(t("vOn")); });
  swVibe.addEventListener("click", () => { vibe = !vibe; st.set("vzj_vibe", vibe); syncSettings(); buzz(60); });
  volM.addEventListener("input", () => A.setMusicVol(volM.value / 100));
  volS.addEventListener("input", () => A.setSfxVol(volS.value / 100));
  volS.addEventListener("change", () => A.play("land", 4));
  vSel.addEventListener("change", () => { Voice.name = vSel.value; st.set("vzj_voice_name", Voice.name); Voice.say(t("vWelcome")); });
  $("#btn-voice-test").addEventListener("click", () => { const was = Voice.on; Voice.on = true; Voice.say(t("vTest")); Voice.on = was; });
  $$("#seg-theme button").forEach((b) => b.addEventListener("click", () => {
    A.resume(); A.setBaseTheme(b.dataset.theme); A.setMode("game", 0); A.startMusic(); syncSettings(); A.play("click");
    setTimeout(() => { if (S.mode !== "play") A.setMode("menu", 0); }, 4000);
  }));
  // langue
  function applyLang() {
    const L = T();
    document.documentElement.lang = lang === "ar" ? "ar" : lang;
    document.documentElement.dir = "ltr"; // la mise en page reste fixe ; seuls les textes passent en arabe (voir CSS #app.rtl)
    app.classList.toggle("rtl", lang === "ar");
    $$("[data-i18n]").forEach((el) => { const v = L[el.dataset.i18n]; if (typeof v === "string") el.textContent = v; });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = L[el.dataset.i18nHtml]; });
    $$("#seg-lang button, #lang-switch button").forEach((b) => { b.classList.toggle("on", b.dataset.lang === lang); b.setAttribute("aria-pressed", b.dataset.lang === lang); });
    Voice.load();
  }
  $$("#seg-lang button, #lang-switch button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang; A.store.set("vzj_lang", lang);
    Voice.name = ""; A.store.set("vzj_voice_name", "");
    applyLang(); A.play("click");
    Voice.say(t("vWelcome"));
  }));

  // bouton muet rapide
  $("#btn-mute").addEventListener("click", (e) => {
    e.currentTarget.blur(); A.resume();
    const anyOn = A.musicOn || A.sfxOn;
    if (anyOn) { if (A.musicOn) A.toggleMusic(); if (A.sfxOn) A.toggleSfx(); }
    else { A.toggleMusic(); A.toggleSfx(); A.startMusic(); }
    syncSettings();
    toast(anyOn ? t("muteOff") : t("muteOn"));
  });
  $("#btn-settings").addEventListener("click", (e) => { e.currentTarget.blur(); A.resume(); openModal("settings"); });

  // ---------- partage : image du score avec le logo ViZea ----------
  const GAME_URL = "https://mohamedamineaitsalah.github.io/play-with-vizea/";
  let shareBlob = null, shareURL = null, shareFor = "", shareChallenge = false;

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  async function makeShareImage() {
    const ar = lang === "ar";
    const TXT = ar ? '"Cairo", "Space Grotesk", sans-serif' : '"Space Grotesk", "Inter", sans-serif';
    try {
      await Promise.all(["800 100px Dexperdy", "italic 800 100px Dexperdy", '300 100px "Space Grotesk"', '500 60px "Space Grotesk"', '700 40px "Space Grotesk"', "700 40px Cairo"].map((f) => document.fonts.load(f)));
    } catch (e) { /* polices de secours */ }
    const Wc = 1080, Hc = 1350;
    const c = document.createElement("canvas"); c.width = Wc; c.height = Hc;
    const g = c.getContext("2d");
    const ls = (v) => { if ("letterSpacing" in g) g.letterSpacing = v; };
    // fond ViZea
    g.fillStyle = "#070809"; g.fillRect(0, 0, Wc, Hc);
    let gr = g.createRadialGradient(Wc / 2, 560, 0, Wc / 2, 560, 900);
    gr.addColorStop(0, "rgba(30,215,96,0.32)"); gr.addColorStop(0.5, "rgba(30,215,96,0.08)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc);
    g.save(); g.translate(Wc / 2, Hc / 2); g.rotate(-Math.PI / 4);
    [[-260, 110, 0.22], [20, 70, 0.16], [330, 40, 0.1]].forEach(([y, th, a]) => {
      const lg = g.createLinearGradient(-1000, 0, 1000, 0);
      lg.addColorStop(0, "rgba(30,215,96,0)"); lg.addColorStop(0.5, `rgba(30,215,96,${a})`); lg.addColorStop(1, "rgba(30,215,96,0)");
      g.fillStyle = lg; g.fillRect(-1000, y - th / 2, 2000, th);
    });
    g.restore();
    if (logo.complete && logo.naturalWidth) { g.save(); g.globalAlpha = 0.09; g.drawImage(logo, 0, 0, 338, 338, Wc / 2 - 560, 260, 1120, 1120); g.restore(); }
    const vg = g.createRadialGradient(Wc / 2, Hc / 2, 300, Wc / 2, Hc / 2, 900);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)");
    g.fillStyle = vg; g.fillRect(0, 0, Wc, Hc);
    // cadre
    rr(g, 30, 30, Wc - 60, Hc - 60, 48); g.lineWidth = 3; g.strokeStyle = "rgba(30,215,96,0.45)"; g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle";
    // logo + JUMP
    if (logo.complete && logo.naturalWidth) {
      g.save(); g.shadowColor = "rgba(30,215,96,0.6)"; g.shadowBlur = 40;
      g.drawImage(logo, Wc / 2 - 290, 96, 580, 580 * 338 / 1200); g.restore();
    }
    g.save(); g.font = "italic 800 118px Dexperdy, sans-serif"; g.fillStyle = C.yellow; g.shadowColor = "rgba(252,255,69,0.5)"; g.shadowBlur = 30;
    g.fillText("JUMP", Wc / 2, 356); g.restore();
    // score
    g.direction = ar ? "rtl" : "ltr";
    g.font = `700 34px ${TXT}`; g.fillStyle = "rgba(255,255,255,0.62)"; ls("10px");
    g.fillText(t("imgScore"), Wc / 2, 462); ls("0px");
    g.direction = "ltr";
    g.save(); g.font = '300 250px "Space Grotesk", sans-serif'; g.fillStyle = "#fff"; g.shadowColor = "rgba(30,215,96,0.7)"; g.shadowBlur = 60;
    g.fillText(fmt(S.score), Wc / 2, 610); g.restore();
    // ruban du rang
    const rank = rankFor(S.score);
    g.direction = ar ? "rtl" : "ltr";
    g.font = `700 44px ${TXT}`;
    const rw = Math.max(380, g.measureText(rank).width + 150), ry = 752;
    const rg = g.createLinearGradient(0, ry - 42, 0, ry + 42); rg.addColorStop(0, "#fff56a"); rg.addColorStop(1, "#d8b800");
    g.fillStyle = rg; g.beginPath();
    g.moveTo(Wc / 2 - rw / 2, ry - 42); g.lineTo(Wc / 2 + rw / 2, ry - 42); g.lineTo(Wc / 2 + rw / 2 - 30, ry); g.lineTo(Wc / 2 + rw / 2, ry + 42);
    g.lineTo(Wc / 2 - rw / 2, ry + 42); g.lineTo(Wc / 2 - rw / 2 + 30, ry); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.fillText(rank, Wc / 2, ry + 3);
    // nouveau record
    let y0 = 852;
    if (S.lastIsNew) {
      g.font = `700 34px ${TXT}`;
      const nt = t("newRecord"), nw = g.measureText(nt).width + 70;
      g.save(); g.shadowColor = "rgba(252,255,69,0.6)"; g.shadowBlur = 30; rr(g, Wc / 2 - nw / 2, y0 - 32, nw, 64, 32); g.fillStyle = C.yellow; g.fill(); g.restore();
      g.fillStyle = C.ink; g.fillText(nt, Wc / 2, y0 + 2);
      y0 += 70;
    } else y0 += 10;
    // statistiques
    g.direction = "ltr";
    const tiles = [["x" + S.bestCombo, "⚡ " + t("combo")], [String(S.jumps), "↗ " + t("jumps")], [fmt(S.best), "🏆 " + t("recordT")]];
    const tw = 290, gap = 30, tx0 = (Wc - (tw * 3 + gap * 2)) / 2, th = 170, ty = y0 + 10;
    tiles.forEach(([v, l], i) => {
      const x = tx0 + i * (tw + gap);
      rr(g, x, ty, tw, th, 28); g.fillStyle = i === 2 ? "rgba(252,255,69,0.08)" : "rgba(255,255,255,0.05)"; g.fill();
      g.lineWidth = 2; g.strokeStyle = i === 2 ? "rgba(252,255,69,0.45)" : "rgba(255,255,255,0.14)"; g.stroke();
      g.font = '500 66px "Space Grotesk", sans-serif'; g.fillStyle = i === 2 ? C.yellow : "#fff"; g.fillText(v, x + tw / 2, ty + 70);
      g.direction = ar ? "rtl" : "ltr";
      g.font = `700 28px ${TXT}`; g.fillStyle = "rgba(255,255,255,0.62)"; g.fillText(l, x + tw / 2, ty + 132);
      g.direction = "ltr";
    });
    // défi + lien
    const by = Math.min(Hc - 160, ty + th + 80);
    g.direction = ar ? "rtl" : "ltr";
    g.font = `800 50px ${TXT}`; g.fillStyle = C.green; g.fillText(t("imgBeat"), Wc / 2, by);
    g.direction = "ltr";
    g.font = '500 28px "Space Grotesk", sans-serif'; g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillText(GAME_URL.replace("https://", "").replace(/\/$/, ""), Wc / 2, by + 60);
    g.font = '700 28px "Space Grotesk", sans-serif'; g.fillStyle = C.yellow; g.fillText("#PlayWithViZea", Wc / 2, by + 104);
    return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
  }

  async function prepareShare() {
    const key = [S.score, S.best, S.bestCombo, S.jumps, lang, !!S.lastIsNew].join("|");
    if (shareBlob && shareFor === key) return;
    const blob = await makeShareImage();
    if (!blob) return;
    shareBlob = blob; shareFor = key;
    if (shareURL) URL.revokeObjectURL(shareURL);
    shareURL = URL.createObjectURL(blob);
    const img = $("#share-img"); img.src = shareURL;
    $("#btn-share-dl").href = shareURL;
    $("#share-loading").hidden = true;
  }
  const shareText = () => (shareChallenge ? t("challengeText", { n: fmt(S.score) }) : t("shareText", { n: fmt(S.score), c: S.bestCombo })) + " " + GAME_URL;
  async function openShare(challenge) {
    shareChallenge = challenge;
    openModal("share");
    if (!shareBlob) $("#share-loading").hidden = false;
    await prepareShare();
  }
  async function copyShareText() {
    try { await navigator.clipboard.writeText(shareText()); toast(t("copied")); }
    catch (e) { toast(t("noShare")); }
  }
  $("#btn-share").addEventListener("click", () => { A.play("click"); openShare(false); });
  $("#btn-challenge").addEventListener("click", () => { A.play("click"); openShare(true); });
  $("#btn-share-copy").addEventListener("click", () => { A.play("click"); copyShareText(); });
  $("#btn-share-dl").addEventListener("click", (e) => { if (!shareURL) { e.preventDefault(); return; } A.play("click"); setTimeout(() => toast(t("saved")), 300); });
  $("#btn-share-now").addEventListener("click", () => {
    A.play("click");
    if (!shareBlob) { prepareShare(); return; }
    const file = new File([shareBlob], "vizea-jump-score.png", { type: "image/png" });
    const data = { files: [file], title: "ViZea Jump", text: shareText() };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      // téléphone : ouvre WhatsApp, Instagram, Snapchat… avec l'image
      navigator.share(data).catch((e) => { if (e && e.name !== "AbortError") { $("#btn-share-dl").click(); copyShareText(); } });
    } else {
      // ordinateur : télécharge l'image et copie le texte
      $("#btn-share-dl").click();
      copyShareText();
    }
  });

  // ---------- entrées ----------
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); A.resume(); jump(); });
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
    if (e.key === " " || e.key === "ArrowUp" || e.key === "Enter") {
      e.preventDefault();
      if ($(".screen.modal.active")) return;
      if (S.mode === "play") jump(); else if (S.mode === "home" || S.mode === "over") startGame();
    }
    if (e.key === "Escape") closeModals();
    if (e.key === "m" || e.key === "M") $("#btn-mute").click();
  });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.mode === "play" && location.hash !== "#debug") openModal("settings"); });

  $("#btn-play").addEventListener("click", () => { A.resume(); A.startMusic(); A.play("click"); startGame(); });
  $$("[data-action]").forEach((btn) => btn.addEventListener("click", () => {
    A.resume(); A.startMusic(); A.play("click");
    if (btn.dataset.action === "restart") startGame(); else goHome();
  }));
  $$("[data-open]").forEach((btn) => btn.addEventListener("click", () => { A.resume(); A.play("click"); openModal(btn.dataset.open); }));
  $$("[data-close]").forEach((btn) => btn.addEventListener("click", () => { A.play("click"); closeModals(); }));
  // le navigateur autorise le son seulement après un premier geste : on démarre au tout premier contact, n'importe où
  const unlockEvents = ["pointerdown", "touchstart", "keydown", "click"];
  function unlockSound() {
    A.resume(); A.startMusic(); syncSettings();
    unlockEvents.forEach((ev) => window.removeEventListener(ev, unlockSound, true));
  }
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlockSound, { capture: true, passive: true }));

  if (location.hash === "#debug") window.__vzj = { S, update, render, jump, gameOver, colW: () => colW, makeShareImage, openShare };

  if ("speechSynthesis" in window) { Voice.load(); speechSynthesis.onvoiceschanged = () => Voice.load(); }
  else fillVoices();
  resize();
  applyLang();
  syncSettings();
  goHome();
  try { A.resume(); A.startMusic(); } catch (e) { /* le son démarrera au premier geste */ }
  if (location.hash === "#games") openModal("games");
  requestAnimationFrame(frame);
  if (document.fonts) document.fonts.ready.then(buildBg);
})();
