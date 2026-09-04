'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// ── Shooting Star ─────────────────────────────────────────────────────────────
const SHOOTING_STAR_SPEED = 180;        // px/s
const SHOOTING_STAR_TTL = 5;            // segundos
const SHOOTING_STAR_RADIUS = 8;         // radio de colisión
const SHOOTING_STAR_SPAWN_INTERVAL = 5; // segundos entre intentos
const SHOOTING_STAR_SPAWN_CHANCE = 0.10; // 10% probabilidad
const SHOOTING_STAR_POINTS = 150;       // puntos al destruir
const SHOOTING_STAR_MAX = 2;            // máximo simultáneos

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── SpeedBoost (velocidad) ────────────────────────────────────────────────────
const BOOST_DURATION    = 5;     // segundos de duración
const BOOST_THRUST      = 390;   // +50% de 260
const BOOST_SPAWN_CHANCE = 0.25; // probabilidad al destruir asteroide
const BOOST_TTL         = 8;     // segundos antes de desaparecer

class SpeedBoost {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.radius = 10;
    this.ttl    = BOOST_TTL;
    this.dead   = false;
    this.phase  = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.ttl -= dt;
    this.phase += dt * 4;
    this.y += Math.sin(this.phase) * 12 * dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = Math.floor(this.ttl * 6) % 2 === 0;
    const alpha = blink && this.ttl < 2 ? 0.4 : 1;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = `rgba(0, 150, 255, ${0.22 * alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 190, 255, ${alpha})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 190, 255, ${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6,  0);
    ctx.lineTo( 6,  0);
    ctx.moveTo( 0, -6);
    ctx.lineTo( 0,  6);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Shooting Star ─────────────────────────────────────────────────────────────
class ShootingStar {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.radius = SHOOTING_STAR_RADIUS;
    this.dead = false;
    this.ttl = SHOOTING_STAR_TTL;

    const speed = SHOOTING_STAR_SPEED + rand(-20, 20);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.trail = [];
    this.maxTrail = 12;
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;

    if (this.ttl <= 0) this.dead = true;
    if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) {
      this.dead = true;
    }
  }

  draw() {
    const alpha = Math.max(0, this.ttl / SHOOTING_STAR_TTL);
    const blink = this.ttl < 1.5 && Math.floor(this.ttl * 8) % 2 === 0;
    const drawAlpha = blink ? alpha * 0.4 : alpha;

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const trailAlpha = (i / this.trail.length) * 0.6 * drawAlpha;
      const trailSize = (i / this.trail.length) * 3;
      ctx.fillStyle = `rgba(255, 220, 80, ${trailAlpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = drawAlpha;

    ctx.fillStyle = 'rgba(255, 255, 150, 0.25)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFACD';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.speedBoostTimer = 0;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer < 0) this.speedBoostTimer = 0;
    }

    const ROT     = 3.5;   // rad/s
    const THRUST  = this.speedBoostTimer > 0 ? BOOST_THRUST : 260;
    const DRAG    = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    SKINS[currentSkinIndex].draw(ctx, this);

    ctx.restore();
  }
}

// ── Skins ───────────────────────────────────────────────────────────────────
const SKINS = [
  {
    id: 'classic',
    name: 'Clásica',
    draw(ctx, ship) {
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo(-12, -9);
      ctx.lineTo( -7,  0);
      ctx.lineTo(-12,  9);
      ctx.closePath();
      ctx.stroke();
      if (ship.thrusting && Math.random() > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-8 - rand(6, 14), 0);
        ctx.lineTo(-8,  4);
        if (ship.speedBoostTimer > 0)
          ctx.strokeStyle = 'rgba(0, 190, 255, 0.9)';
        else
          ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
        ctx.stroke();
      }
    },
    preview(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / s;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo(-12, -9);
      ctx.lineTo( -7,  0);
      ctx.lineTo(-12,  9);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'arrow',
    name: 'Flecha',
    draw(ctx, ship) {
      ctx.beginPath();
      ctx.moveTo( 22,  0);
      ctx.lineTo( -4, -6);
      ctx.lineTo( -8, -6);
      ctx.lineTo( -8,  6);
      ctx.lineTo( -4,  6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -6);
      ctx.lineTo(-3,  6);
      ctx.stroke();
      if (ship.thrusting && Math.random() > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(-9 - rand(6, 14), 0);
        ctx.lineTo(-9,  3);
        if (ship.speedBoostTimer > 0)
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
        else
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.85)';
        ctx.stroke();
      }
    },
    preview(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1.5 / s;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo( 22,  0);
      ctx.lineTo( -4, -6);
      ctx.lineTo( -8, -6);
      ctx.lineTo( -8,  6);
      ctx.lineTo( -4,  6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -6);
      ctx.lineTo(-3,  6);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'diamond',
    name: 'Rombo',
    draw(ctx, ship) {
      ctx.beginPath();
      ctx.moveTo( 18,  0);
      ctx.lineTo(  0, -8);
      ctx.lineTo(-10,  0);
      ctx.lineTo(  0,  8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(  6, -2);
      ctx.lineTo(  6,  2);
      ctx.stroke();
      if (ship.thrusting && Math.random() > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-11, -3);
        ctx.lineTo(-11 - rand(6, 14), 0);
        ctx.lineTo(-11,  3);
        if (ship.speedBoostTimer > 0)
          ctx.strokeStyle = 'rgba(0, 190, 255, 0.9)';
        else
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
        ctx.stroke();
      }
    },
    preview(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5 / s;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo( 18,  0);
      ctx.lineTo(  0, -8);
      ctx.lineTo(-10,  0);
      ctx.lineTo(  0,  8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(  6, -2);
      ctx.lineTo(  6,  2);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'deltawing',
    name: 'Ala Delta',
    draw(ctx, ship) {
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo( -6, -11);
      ctx.lineTo(-10, -3);
      ctx.lineTo(-10,  3);
      ctx.lineTo( -6,  11);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(-10,  3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo( 2,  0);
      ctx.lineTo(10, -3);
      ctx.moveTo( 2,  0);
      ctx.lineTo(10,  3);
      ctx.stroke();
      if (ship.thrusting && Math.random() > 0.35) {
        ctx.beginPath();
        ctx.moveTo(-11, -2);
        ctx.lineTo(-11 - rand(6, 14), 0);
        ctx.lineTo(-11,  2);
        if (ship.speedBoostTimer > 0)
          ctx.strokeStyle = 'rgba(0, 190, 255, 0.9)';
        else
          ctx.strokeStyle = 'rgba(255, 60, 60, 0.85)';
        ctx.stroke();
      }
    },
    preview(ctx, x, y, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = '#f44';
      ctx.lineWidth = 1.5 / s;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo( -6, -11);
      ctx.lineTo(-10, -3);
      ctx.lineTo(-10,  3);
      ctx.lineTo( -6,  11);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -3);
      ctx.lineTo(-10,  3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo( 2,  0);
      ctx.lineTo(10, -3);
      ctx.moveTo( 2,  0);
      ctx.lineTo(10,  3);
      ctx.stroke();
      ctx.restore();
    }
  }
];

const SKIN_COLORS = ['#fff', '#0ff', '#ffd700', '#f44'];

let currentSkinIndex = 0;
let menuSelection = 0;
let menuStars = [];

function loadSkin() {
  const saved = localStorage.getItem('selectedSkin');
  if (saved !== null) {
    const idx = SKINS.findIndex(s => s.id === saved);
    if (idx !== -1) currentSkinIndex = idx;
  }
  menuSelection = currentSkinIndex;
}

function saveSkin() {
  currentSkinIndex = menuSelection;
  localStorage.setItem('selectedSkin', SKINS[currentSkinIndex].id);
}

function initMenuStars() {
  menuStars = [];
  for (let i = 0; i < 80; i++) {
    menuStars.push({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.5), speed: rand(8, 25) });
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, speedBoosts, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function trySpawnSpeedBoost(x, y) {
  if (speedBoosts.length > 0) return;
  if (Math.random() < BOOST_SPAWN_CHANCE)
    speedBoosts.push(new SpeedBoost(x, y));
}

function spawnShootingStar() {
  if (shootingStars.length >= SHOOTING_STAR_MAX) return;

  let x, y, angle;
  const edge = randInt(0, 3);

  if (edge === 0) {
    x = rand(0, W);
    y = -20;
    angle = Math.PI / 2 + rand(-0.5, 0.5);
  } else if (edge === 1) {
    x = rand(0, W);
    y = H + 20;
    angle = -Math.PI / 2 + rand(-0.5, 0.5);
  } else if (edge === 2) {
    x = -20;
    y = rand(0, H);
    angle = rand(-0.5, 0.5);
  } else {
    x = W + 20;
    y = rand(0, H);
    angle = Math.PI + rand(-0.5, 0.5);
  }

  shootingStars.push(new ShootingStar(x, y, angle));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  speedBoosts = [];
  shootingStars = [];
  shootingStarTimer = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function initMenu() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  speedBoosts = [];
  shootingStars = [];
  shootingStarTimer = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'menu';
  initMenuStars();
  loadSkin();
}

function updateMenu(dt) {
  if (pressed('ArrowLeft') || pressed('Tab')) {
    menuSelection = wrap(menuSelection - 1, SKINS.length);
  }
  if (pressed('ArrowRight')) {
    menuSelection = wrap(menuSelection + 1, SKINS.length);
  }
  if (pressed('Enter') || pressed('Space')) {
    saveSkin();
    initGame();
    return;
  }
  particles.forEach(p => p.update(dt));
  particles = particles.filter(p => !p.dead);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  speedBoosts = [];
  shootingStars = [];
  shootingStarTimer = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.speedBoostTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    updateMenu(dt);
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    speedBoosts.forEach(b => b.update(dt));
    speedBoosts = speedBoosts.filter(b => !b.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));
  speedBoosts.forEach(b => b.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  particles = particles.filter(p => !p.dead);

  // Spawn de shooting star
  shootingStarTimer += dt;
  if (shootingStarTimer >= SHOOTING_STAR_SPAWN_INTERVAL) {
    shootingStarTimer = 0;
    if (Math.random() < SHOOTING_STAR_SPAWN_CHANCE)
      spawnShootingStar();
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        trySpawnSpeedBoost(a.x, a.y);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs shooting star
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += SHOOTING_STAR_POINTS;
        explode(s.x, s.y, 12);
      }
    }
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs shooting star
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (!s.dead && dist(ship, s) < ship.radius + s.radius) {
        killShip();
        break;
      }
    }
  }

  // Nave vs speed boost
  for (const b of speedBoosts) {
    if (!b.dead && dist(ship, b) < ship.radius + b.radius) {
      b.dead = true;
      ship.speedBoostTimer = BOOST_DURATION;
      explode(b.x, b.y, 6);
    }
  }
  speedBoosts = speedBoosts.filter(b => !b.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  SKINS[currentSkinIndex].preview(ctx, x, y, 0.7);
}

function drawMenu() {
  // Estrellas de fondo
  for (const s of menuStars) {
    s.y += s.speed * 0.016;
    if (s.y > H) s.y = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SELECCIONA TU NAVE', W / 2, 90);

  const PREVIEW_SCALE = 1.6;
  const PREVIEW_RADIUS = 34;
  const spacing = 170;
  const centerX = W / 2 - spacing * (SKINS.length - 1) / 2;
  const centerY = H / 2 + 20;

  for (let i = 0; i < SKINS.length; i++) {
    const px = centerX + i * spacing;
    const selected = i === menuSelection;

    // Resaltado
    ctx.save();
    ctx.strokeStyle = selected ? SKIN_COLORS[i] : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.arc(px, centerY, PREVIEW_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Preview de la nave
    const bob = selected ? Math.sin(performance.now() / 250) * 0.1 : 0;
    SKINS[i].preview(ctx, px, centerY + bob, PREVIEW_SCALE);

    // Nombre
    ctx.fillStyle = selected ? SKIN_COLORS[i] : 'rgba(255,255,255,0.55)';
    ctx.font = selected ? 'bold 16px monospace' : '14px monospace';
    ctx.fillText(SKINS[i].name, px, centerY + PREVIEW_RADIUS + 26);
  }

  // Selector visual
  const sx = centerX + menuSelection * spacing;
  ctx.fillStyle = SKIN_COLORS[menuSelection];
  ctx.beginPath();
  ctx.moveTo(sx, centerY - PREVIEW_RADIUS - 14);
  ctx.lineTo(sx - 8, centerY - PREVIEW_RADIUS - 26);
  ctx.lineTo(sx + 8, centerY - PREVIEW_RADIUS - 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '15px monospace';
  ctx.fillText('← → SELECCIONAR    ENTER / ESPACIO JUGAR', W / 2, H - 40);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  if (ship.speedBoostTimer > 0 && !ship.dead) {
    const barWidth = 100;
    const barHeight = 6;
    const x = W / 2 - barWidth / 2;
    const y = 34;
    const fill = (ship.speedBoostTimer / BOOST_DURATION) * barWidth;

    ctx.strokeStyle = 'rgba(0, 190, 255, 0.9)';
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = 'rgba(0, 190, 255, 0.75)';
    ctx.fillRect(x, y, fill, barHeight);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'menu') {
    drawMenu();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  speedBoosts.forEach(b => b.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initMenu();
requestAnimationFrame(loop);
