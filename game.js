(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const overlay = document.getElementById("overlay");
  const deployButton = document.getElementById("deploy-button");
  const pauseBadge = document.getElementById("pause-badge");
  const touchControls = document.getElementById("touch-controls");
  const mobile = matchMedia("(max-width: 680px)");
  const W = 960;
  const H = 540;
  const keys = new Set();
  const state = {
    mode: "ready", player: null, bullets: [], enemies: [], particles: [],
    score: 0, wave: 1, remaining: 0, spawnTimer: 0, wavePause: 0,
    lastTime: 0, aim: { x: W / 2, y: H / 2 }, pointerDown: false,
    joy: { x: 0, y: 0 }, joyPointer: null, firePointer: null,
    sound: false, audio: null, shake: 0, background: null,
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }

  function createBackground() {
    const rand = seeded(18707);
    const blocks = [];
    for (let i = 0; i < 30; i++) {
      const x = rand() * W, y = rand() * H;
      blocks.push({ x, y, w: 25 + rand() * 95, h: 15 + rand() * 65 });
    }
    state.background = { blocks, rand };
  }

  function seeded(seed) {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function start() {
    state.mode = "playing";
    state.player = { x: W / 2, y: H / 2, radius: 13, health: 100, cooldown: 0, invulnerable: 0, angle: -Math.PI / 2 };
    state.bullets = [];
    state.enemies = [];
    state.particles = [];
    state.score = 0;
    state.wave = 1;
    state.remaining = 4;
    state.spawnTimer = .5;
    state.wavePause = 0;
    state.shake = 0;
    state.lastTime = performance.now();
    overlay.hidden = true;
    hud.hidden = false;
    pauseBadge.hidden = true;
    touchControls.setAttribute("aria-hidden", String(!mobile.matches));
    syncHud();
  }

  function endGame() {
    state.mode = "over";
    overlay.hidden = false;
    document.getElementById("overlay-title").innerHTML = "MISSION<br><span>FAILED.</span>";
    document.getElementById("overlay-copy").innerHTML =
      `You made it to wave ${String(state.wave).padStart(2, "0")} and eliminated ${state.score} hostiles.<br>The frontline needs you. Ready for another drop?`;
    document.getElementById("button-label").textContent = "REDEPLOY";
    hud.hidden = true;
    touchControls.setAttribute("aria-hidden", "true");
  }

  function syncHud() {
    const p = state.player;
    if (!p) return;
    document.getElementById("health-fill").style.width = `${Math.max(0, p.health)}%`;
    document.getElementById("health-value").textContent = Math.ceil(Math.max(0, p.health));
    document.getElementById("wave-number").textContent = `WAVE ${String(state.wave).padStart(2, "0")}`;
    document.getElementById("score-value").textContent = String(state.score).padStart(4, "0");
    document.getElementById("status-text").textContent = state.enemies.length ? "CONTACT" : "SECTOR CLEAR";
  }

  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  }

  function shoot() {
    const p = state.player;
    if (state.mode !== "playing" || !p || p.cooldown > 0) return;
    let angle = p.angle;
    if (mobile.matches && state.enemies.length) {
      const target = state.enemies.reduce((best, e) =>
        Math.hypot(e.x - p.x, e.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? e : best, state.enemies[0]);
      angle = Math.atan2(target.y - p.y, target.x - p.x);
    }
    const speed = 540;
    state.bullets.push({ x: p.x + Math.cos(angle) * 18, y: p.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .9, friendly: true });
    p.cooldown = .16;
    burst(p.x + Math.cos(angle) * 19, p.y + Math.sin(angle) * 19, "#f2d47a", 3, 65);
    if (state.sound) tone(240, .045, .025);
  }

  function tone(freq, duration, volume) {
    try {
      state.audio = state.audio || new AudioContext();
      const oscillator = state.audio.createOscillator(), gain = state.audio.createGain();
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(volume, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, state.audio.currentTime + duration);
      oscillator.connect(gain).connect(state.audio.destination);
      oscillator.start(); oscillator.stop(state.audio.currentTime + duration);
    } catch (error) {
      console.warn("Audio is unavailable in this browser.", error);
      state.sound = false;
      document.getElementById("sound-state").textContent = "OFF";
    }
  }

  function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -18 : side === 1 ? W + 18 : Math.random() * W;
    const y = side === 2 ? -18 : side === 3 ? H + 18 : Math.random() * H;
    const heavy = state.wave > 1 && Math.random() < Math.min(.18 + state.wave * .025, .5);
    state.enemies.push({ x, y, radius: heavy ? 17 : 12, health: heavy ? 3 : 1, speed: heavy ? 38 : 55 + Math.min(state.wave * 3, 28),
      heavy, cooldown: 1.2 + Math.random() * 1.6, phase: Math.random() * Math.PI * 2 });
  }

  function burst(x, y, color, count, force) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, speed = force * (.25 + Math.random() * .75);
      state.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .2 + Math.random() * .36, maxLife: .56, color, size: 1 + Math.random() * 2.5 });
    }
  }

  function update(dt) {
    if (state.mode !== "playing") return;
    const p = state.player;
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    const left = keys.has("a") || keys.has("arrowleft");
    const right = keys.has("d") || keys.has("arrowright");
    const up = keys.has("w") || keys.has("arrowup");
    const down = keys.has("s") || keys.has("arrowdown");
    let dx = Number(right) - Number(left) + state.joy.x;
    let dy = Number(down) - Number(up) + state.joy.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    p.x = clamp(p.x + dx * 205 * dt, 19, W - 19);
    p.y = clamp(p.y + dy * 205 * dt, 19, H - 19);
    if (!mobile.matches) p.angle = Math.atan2(state.aim.y - p.y, state.aim.x - p.x);
    if (state.pointerDown || state.firePointer !== null || keys.has(" ")) shoot();

    if (state.remaining > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) { spawnEnemy(); state.remaining--; state.spawnTimer = Math.max(.36, .9 - state.wave * .025); }
    } else if (!state.enemies.length) {
      state.wavePause += dt;
      if (state.wavePause > 2.1) {
        state.wave++;
        state.remaining = Math.min(4 + state.wave * 2, 24);
        state.spawnTimer = .4;
        state.wavePause = 0;
        p.health = Math.min(100, p.health + 12);
        syncHud();
      }
    }

    for (const e of state.enemies) {
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      const distance = Math.hypot(p.x - e.x, p.y - e.y);
      if (distance > e.radius + p.radius + 8) {
        e.x += Math.cos(angle) * e.speed * dt;
        e.y += Math.sin(angle) * e.speed * dt;
      }
      e.phase += dt * 5;
      e.cooldown -= dt;
      if (distance < 270 && e.cooldown <= 0) {
        const a = angle + (Math.random() - .5) * .16;
        state.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, life: 2.4, friendly: false });
        e.cooldown = Math.max(.8, 2.3 - state.wave * .05);
      }
    }

    for (const b of state.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.friendly) {
        for (const e of state.enemies) {
          if (e.health > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.radius + 4) {
            e.health--; b.life = 0;
            burst(b.x, b.y, e.heavy ? "#d9a568" : "#e45947", 4, 80);
            if (e.health <= 0) {
              state.score++;
              state.shake = Math.max(state.shake, e.heavy ? 5 : 2);
              burst(e.x, e.y, e.heavy ? "#d9a568" : "#e45947", 12, 130);
              if (state.sound) tone(100, .1, .04);
            }
            break;
          }
        }
      } else if (p.invulnerable <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < p.radius + 4) {
        b.life = 0; p.health -= 9; p.invulnerable = .5; state.shake = 7;
        burst(p.x, p.y, "#e45947", 8, 100);
        if (state.sound) tone(90, .13, .04);
        if (p.health <= 0) { syncHud(); endGame(); return; }
      }
    }
    state.bullets = state.bullets.filter(b => b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30);
    state.enemies = state.enemies.filter(e => e.health > 0);
    for (const particle of state.particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      particle.vx *= .97; particle.vy *= .97; particle.life -= dt;
    }
    state.particles = state.particles.filter(particle => particle.life > 0);
    state.shake = Math.max(0, state.shake - dt * 22);
    syncHud();
  }

  function draw() {
    ctx.save();
    const sx = canvas.width / W, sy = canvas.height / H;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#242b20"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (state.shake) ctx.translate((Math.random() - .5) * state.shake, (Math.random() - .5) * state.shake);
    drawWorld();
    for (const b of state.bullets) {
      ctx.fillStyle = b.friendly ? "#f4d676" : "#e97859";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.friendly ? 3 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const e of state.enemies) drawEnemy(e);
    if (state.player && state.mode !== "ready") drawPlayer(state.player);
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    if (state.mode === "playing" && !mobile.matches) drawCrosshair();
    ctx.restore();
    ctx.restore();
    requestAnimationFrame(draw);
  }

  function drawWorld() {
    const { blocks, rand } = state.background;
    ctx.fillStyle = "#2d3528";
    for (let x = 0; x < W; x += 48) for (let y = 0; y < H; y += 48) {
      ctx.fillStyle = ((x / 48 + y / 48) % 2) ? "#2b3327" : "#2d3529";
      ctx.fillRect(x, y, 48, 48);
      ctx.fillStyle = "#e0e6be08"; ctx.fillRect(x + 6, y + 8, 2, 2);
    }
    ctx.strokeStyle = "#bec9a00b"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    blocks.forEach((b, i) => {
      ctx.fillStyle = "#20271e"; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#384331"; ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, Math.max(3, b.h * .12));
      ctx.fillStyle = "#181e18"; ctx.fillRect(b.x + 7, b.y + 10, Math.max(3, b.w - 14), Math.max(2, b.h - 16));
      if (i % 3 === 0) { ctx.fillStyle = "#69724e"; ctx.fillRect(b.x + b.w * .45, b.y + b.h * .5, 3, 3); }
    });
    ctx.strokeStyle = "#c2e06a66"; ctx.setLineDash([8, 9]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 78, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e8e6d919"; ctx.font = "9px DM Mono, monospace"; ctx.fillText("SAFE ZONE // 07", W / 2 - 43, H / 2 + 112);
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 600);
    vignette.addColorStop(0, "transparent"); vignette.addColorStop(1, "#090c09a8");
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  }

  function drawPlayer(p) {
    if (p.invulnerable > 0 && Math.floor(p.invulnerable * 18) % 2 === 0) ctx.globalAlpha = .45;
    drawSoldier(p.x, p.y, p.angle, {
      uniform: "#718544", vest: "#b4ca67", helmet: "#c2e06a",
      pants: "#4b5935", skin: "#c39a72", weapon: "#292f24", accent: "#e4e0c9",
    });
    ctx.globalAlpha = 1;
  }

  function drawEnemy(e) {
    const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
    const uniform = e.heavy ? "#75503a" : "#75413b";
    const scale = e.heavy ? 1.22 : 1;
    drawSoldier(e.x, e.y, angle, {
      uniform, vest: e.heavy ? "#c49a62" : "#b65c4d",
      helmet: e.heavy ? "#d2a164" : "#d85a48",
      pants: e.heavy ? "#4c3a2e" : "#4c302c",
      skin: "#b98766", weapon: "#211d19", accent: e.heavy ? "#edc681" : "#dd9580",
    }, scale);
    if (e.heavy) {
      ctx.fillStyle = "#151a14"; ctx.fillRect(e.x - 17, e.y - 26, 34, 3);
      ctx.fillStyle = "#d2a164"; ctx.fillRect(e.x - 16, e.y - 25, 32 * e.health / 3, 1);
    }
  }

  function drawSoldier(x, y, angle, colors, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#10140fc9";
    ctx.beginPath(); ctx.ellipse(-1, 4, 20, 14, 0, 0, Math.PI * 2); ctx.fill();

    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = colors.pants;
    ctx.beginPath();
    ctx.moveTo(-7, -4); ctx.lineTo(-16, -9);
    ctx.moveTo(-7, 4); ctx.lineTo(-16, 9);
    ctx.stroke();

    ctx.fillStyle = "#181b16";
    ctx.beginPath();
    ctx.ellipse(-18, -9, 4, 3, -.3, 0, Math.PI * 2);
    ctx.ellipse(-18, 9, 4, 3, .3, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = colors.uniform;
    ctx.beginPath();
    ctx.moveTo(1, -5); ctx.lineTo(10, -7);
    ctx.moveTo(1, 5); ctx.lineTo(10, 7);
    ctx.stroke();

    ctx.fillStyle = colors.uniform;
    ctx.beginPath(); ctx.ellipse(-4, 0, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.vest;
    ctx.beginPath(); ctx.ellipse(-2, 0, 8, 6.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#20251d";
    ctx.fillRect(-6, -4, 4, 3);
    ctx.fillRect(-6, 1, 4, 3);

    ctx.fillStyle = colors.skin;
    ctx.beginPath(); ctx.arc(8, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = colors.helmet;
    ctx.beginPath(); ctx.ellipse(8, 0, 6.5, 6, 0, -Math.PI * .8, Math.PI * .8); ctx.fill();
    ctx.fillStyle = colors.accent;
    ctx.fillRect(7, -1, 3, 2);

    ctx.fillStyle = colors.weapon;
    ctx.fillRect(9, -2, 16, 4);
    ctx.fillStyle = "#9a9a7c";
    ctx.fillRect(21, -1, 7, 2);
    ctx.fillStyle = "#171a15";
    ctx.fillRect(13, 1, 3, 5);
    ctx.restore();
  }

  function drawCrosshair() {
    const { x, y } = state.aim;
    ctx.strokeStyle = "#c2e06a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.moveTo(x - 13, y); ctx.lineTo(x - 4, y);
    ctx.moveTo(x + 4, y); ctx.lineTo(x + 13, y); ctx.moveTo(x, y - 13); ctx.lineTo(x, y - 4);
    ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 13); ctx.stroke();
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function frame(time) {
    const dt = Math.min((time - state.lastTime) / 1000 || 0, .04);
    state.lastTime = time;
    update(dt);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointermove", event => {
    state.aim = worldPoint(event);
    if (event.pointerType === "mouse" && state.mode === "playing") state.player.angle = Math.atan2(state.aim.y - state.player.y, state.aim.x - state.player.x);
  });
  canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button === 0) { state.pointerDown = true; canvas.setPointerCapture(event.pointerId); shoot(); }
  });
  canvas.addEventListener("pointerup", event => { if (event.pointerType === "mouse") state.pointerDown = false; });
  canvas.addEventListener("pointercancel", () => { state.pointerDown = false; });
  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === "p" && !event.repeat && state.mode !== "ready" && state.mode !== "over") {
      state.mode = state.mode === "paused" ? "playing" : "paused";
      pauseBadge.hidden = state.mode !== "paused";
    }
    if (key === "enter" && state.mode !== "playing" && state.mode !== "paused") start();
  });
  document.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => { keys.clear(); state.pointerDown = false; if (state.mode === "playing") { state.mode = "paused"; pauseBadge.hidden = false; } });
  deployButton.addEventListener("click", start);
  document.getElementById("sound-toggle").addEventListener("click", () => {
    state.sound = !state.sound;
    document.getElementById("sound-state").textContent = state.sound ? "ON" : "OFF";
    if (state.sound) { tone(440, .06, .035); }
  });

  const joystick = document.getElementById("joystick"), knob = joystick.querySelector(".joystick-knob");
  function moveJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * .32, distance = Math.hypot(dx, dy), scale = distance > max ? max / distance : 1;
    state.joy.x = dx * scale / max; state.joy.y = dy * scale / max;
    knob.style.left = `calc(50% + ${dx * scale}px)`;
    knob.style.top = `calc(50% + ${dy * scale}px)`;
  }
  joystick.addEventListener("pointerdown", event => {
    state.joyPointer = event.pointerId; joystick.setPointerCapture(event.pointerId); moveJoystick(event); event.preventDefault();
  });
  joystick.addEventListener("pointermove", event => { if (event.pointerId === state.joyPointer) moveJoystick(event); });
  function resetJoystick(event) {
    if (event.pointerId !== state.joyPointer) return;
    state.joyPointer = null; state.joy.x = 0; state.joy.y = 0;
    knob.style.left = "50%"; knob.style.top = "50%";
  }
  joystick.addEventListener("pointerup", resetJoystick);
  joystick.addEventListener("pointercancel", resetJoystick);
  const fireButton = document.getElementById("touch-fire");
  fireButton.addEventListener("pointerdown", event => { state.firePointer = event.pointerId; fireButton.setPointerCapture(event.pointerId); shoot(); event.preventDefault(); });
  const releaseFire = event => { if (state.firePointer === event.pointerId) state.firePointer = null; };
  fireButton.addEventListener("pointerup", releaseFire);
  fireButton.addEventListener("pointercancel", releaseFire);
  window.addEventListener("resize", () => { resize(); touchControls.setAttribute("aria-hidden", String(!mobile.matches || state.mode !== "playing")); });

  createBackground();
  resize();
  requestAnimationFrame(frame);
  requestAnimationFrame(draw);
})();
