// game/src/main.js — game loop, screens, camera, shots and autopilot for Sky Courier (~/workspace/makefun/flight-entry/)
// Phases: title -> play -> pause -> results. Query params are only for the
// maker's screenshots and playtests: ?shot=title|flight|drop|results, ?auto=1.

import { CONFIG, clamp, lerp } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createPlane } from './plane.js';
import { createMissions } from './missions.js';
import { renderWorld } from './render.js';
import { renderHud, renderTitle, renderPause, renderResults } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');
const autoMode = params.get('auto') === '1';

const input = createInput(canvas);
const audio = createAudio();
const world = createWorld(20261126);
const plane = createPlane(world);
const missions = createMissions(world, plane);

let phase = 'title'; // title | play | pause | results
let time = 0;
let last = performance.now();
let cam = { x: 0, y: 0 };
let crashShown = false;

// Camera follows the plane with a lead; vertical follow keeps climbs in frame.
function updateCamera(dt) {
  const p = plane.state;
  const targetX = clamp(p.x - CONFIG.canvasW * CONFIG.camLeadX, 0, CONFIG.worldLength - CONFIG.canvasW);
  const targetY = clamp(p.y - 320, 0, 380);
  const snap = phase === 'title' ? 1 : 1 - Math.pow(0.0015, dt);
  cam.x = lerp(cam.x, targetX, snap);
  cam.y = lerp(cam.y, targetY, snap);
}

// Simple autopilot for playtests (?auto=1): flies the next objective and lands.
function autopilot(dt) {
  const p = plane.state;
  const m = missions.state;
  let target = null;
  let wantThrottle = 0.85;
  if (m.phase === 'takeoff') {
    target = { x: p.x + 600, y: 200 };
    wantThrottle = 1;
  } else if (m.phase === 'rings') {
    // Target the next ring still ahead; a ring left behind is skipped —
    // the mission moves on once the plane passes x 11200.
    const next = world.rings.find((r) => !r.hit && r.x > p.x - 50);
    target = next ? { x: next.x, y: next.y } : { x: p.x + 600, y: 260 };
  } else if (m.phase === 'mail') {
    // Only chase a drop zone still ahead; one left behind is missed.
    const zone = world.dropZones.find((z) => !z.done && z.x > p.x - 100);
    if (zone && m.parcelsLeft > 0 && p.x > zone.x - 40 && p.x < zone.x + 40 && p.y > 150 && p.y < 420) {
      missions.dropParcel();
    }
    target = zone ? { x: zone.x, y: 320 } : { x: 13200, y: 200 };
  } else if (m.phase === 'land') {
    // Glide slope: aim for the threshold high and shallow, then put the
    // plane down EARLY on the strip — the runway ends at 13900 and the
    // world ends just past it, so a long float runs out of island.
    if (p.x < 12950) {
      target = { x: 13100, y: 130 };
      wantThrottle = 0.5;
    } else {
      // Aim slightly BELOW the strip so the plane keeps descending into
      // the touchdown instead of floating two units above it forever.
      target = { x: 13350, y: 45 };
      wantThrottle = 0.3;
    }
  }
  if (!target) return;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  let desiredAngle = clamp(Math.atan2(dy, Math.max(40, dx)) * 0.9, -0.5, 0.6);
  if (m.phase === 'land') desiredAngle = clamp(desiredAngle, -0.22, 0.25);
  // Steer the plane by nudging its angle toward the target.
  p.angle = clamp(p.angle + clamp(desiredAngle - p.angle, -1.4 * dt, 1.4 * dt), -0.6, 0.7);
  p.throttle = clamp(p.throttle + (wantThrottle - p.throttle) * dt * 1.5, 0, 1);
  if (p.fuel < 30) {
    const fr = world.fuelRings.find((f) => !f.hit && f.x > p.x);
    if (fr) {
      const fa = clamp(Math.atan2(fr.y - p.y, Math.max(40, fr.x - p.x)) * 0.9, -0.5, 0.6);
      p.angle = clamp(p.angle + clamp(fa - p.angle, -1.4 * dt, 1.4 * dt), -0.6, 0.7);
    }
  }
}

function startFlight() {
  plane.reset();
  // Fresh mission state: rebuild missions so rings/zones/parcels reset too.
  world.rings.forEach((r) => { r.hit = false; });
  world.fuelRings.forEach((f) => { f.hit = false; });
  world.dropZones.forEach((z) => { z.done = false; });
  const fresh = createMissions(world, plane);
  missions.state = fresh.state;
  missions.update = fresh.update;
  missions.dropParcel = fresh.dropParcel;
  missions.finish = fresh.finish;
  missions.notice = fresh.notice;
  crashShown = false;
  phase = 'play';
  audio.unlock();
  audio.click();
}

// Fixed scene setups for the maker's screenshots (?shot=...).
function applyShot(name) {
  const p = plane.state;
  const m = missions.state;
  if (name === 'title') {
    phase = 'title';
    p.x = 300;
    p.y = world.groundHeightAt(300) + 14;
    p.throttle = 0.25;
    cam.x = 0;
    cam.y = 0;
  } else if (name === 'flight') {
    phase = 'play';
    m.phase = 'rings';
    m.ringsHit = 2;
    world.rings[0].hit = true;
    world.rings[1].hit = true;
    p.x = 6600;
    p.y = 290;
    p.angle = 0.12;
    p.speed = 210;
    p.throttle = 0.8;
    p.airborne = true;
    p.fuel = 74;
    m.score = 320;
    m.combo = 2;
    m.comboTimer = 6;
    cam.x = clamp(p.x - CONFIG.canvasW * CONFIG.camLeadX, 0, CONFIG.worldLength - CONFIG.canvasW);
    cam.y = 0;
  } else if (name === 'drop') {
    phase = 'play';
    m.phase = 'mail';
    m.ringsHit = 5;
    world.rings.forEach((r) => { r.hit = true; });
    m.parcelsLeft = 2;
    m.parcelsDelivered = 1;
    world.dropZones[0].done = true;
    p.x = 6980;
    p.y = 330;
    p.angle = -0.08;
    p.speed = 180;
    p.throttle = 0.65;
    p.airborne = true;
    p.fuel = 58;
    m.score = 480;
    m.parcels.push({ x: 7010, y: 300, vy: -90, spin: 1.2 });
    cam.x = clamp(p.x - CONFIG.canvasW * CONFIG.camLeadX, 0, CONFIG.worldLength - CONFIG.canvasW);
    cam.y = 0;
  } else if (name === 'results') {
    phase = 'results';
    m.phase = 'done';
    m.finished = true;
    m.success = true;
    m.grade = 'A';
    m.score = 812;
    m.stats.rings = 5;
    m.stats.drops = 3;
    m.stats.landBonus = 200;
    m.stats.timeBonus = 96;
    m.stats.fuelBonus = 66;
    p.x = 13500;
    p.y = world.groundHeightAt(13500) + 14;
    p.landed = true;
    p.airborne = false;
    p.throttle = 0;
    p.fuel = 33;
    cam.x = clamp(p.x - CONFIG.canvasW * CONFIG.camLeadX, 0, CONFIG.worldLength - CONFIG.canvasW);
    cam.y = 0;
  }
  if (name === 'flight' || name === 'drop') {
    // Freeze the world for a clean, readable shot.
    world.birds.forEach((b, i) => { b.x = 2400 + i * 1300; });
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;

  // Global keys.
  if (input.anyPressed(['KeyM'])) audio.toggleMute();
  if (input.anyPressed(['Enter'])) {
    if (phase === 'title' || phase === 'results') startFlight();
  }
  if (input.anyPressed(['KeyR'])) {
    if (phase === 'results' || phase === 'pause' || phase === 'play') startFlight();
  }
  if (input.anyPressed(['KeyP'])) {
    if (phase === 'play') phase = 'pause';
    else if (phase === 'pause') phase = 'play';
  }
  if (phase === 'title' && input.mouse.clicked) {
    audio.unlock();
    startFlight();
  }

  if (phase === 'title') {
    audio.melodyTick(dt);
    world.update(dt * 0.4);
    plane.state.propAngle += dt * 6;
    updateCamera(dt);
  } else if (phase === 'play') {
    audio.unlock();
    if (autoMode) autopilot(dt);
    const p = plane.state;
    // Space or click drops a parcel.
    if (input.anyPressed(['Space']) || input.mouse.clicked) {
      if (missions.dropParcel()) audio.dropWhistle();
    }
    world.update(dt);
    const event = plane.update(dt, input, world);
    if (event === 'takeoff') {
      audio.takeoff();
    } else if (event === 'bird') {
      audio.thud();
    } else if (event === 'rough') {
      audio.thud();
    }
    missions.update(dt, audio);
    audio.setFlight(p.throttle, p.speed, p.airborne);
    updateCamera(dt);
    if (missions.state.finished && !crashShown) {
      crashShown = true;
      phase = 'results';
      audio.setFlight(0, 0, false);
    }
  }

  // Draw.
  const view = { world, plane, missions, cam, time, input };
  renderWorld(ctx, view);
  if (phase === 'play' || phase === 'pause') renderHud(ctx, view);
  if (phase === 'title') renderTitle(ctx, view);
  if (phase === 'pause') renderPause(ctx);
  if (phase === 'results') renderResults(ctx, view);

  input.endFrame();
}

// Test hook: playtests read the live state from here.
window.__game = {
  get phase() { return phase; },
  get score() { return missions.state.score; },
  get missionPhase() { return missions.state.phase; },
  get finished() { return missions.state.finished; },
  get success() { return missions.state.success; },
  get ringsHit() { return missions.state.ringsHit; },
  get parcelsDelivered() { return missions.state.parcelsDelivered; },
  get fuel() { return plane.state.fuel; },
  get damage() { return plane.state.damage; },
  get crashReason() { return plane.state.crashReason; },
  get landed() { return plane.state.landed; },
  get x() { return plane.state.x; },
  get y() { return plane.state.y; },
  get speed() { return plane.state.speed; },
  get angle() { return plane.state.angle; },
  get throttle() { return plane.state.throttle; },
  start: startFlight,
};

if (shotMode) {
  applyShot(shotMode);
  // In shot mode the world is frozen mid-frame: draw once with a fixed clock.
  time = 12.5;
  updateCamera(1);
  const view = { world, plane, missions, cam, time, input };
  renderWorld(ctx, view);
  if (phase === 'play') renderHud(ctx, view);
  if (phase === 'title') renderTitle(ctx, view);
  if (phase === 'results') renderResults(ctx, view);
} else {
  if (autoMode && phase === 'title') startFlight();
  requestAnimationFrame(frame);
}
