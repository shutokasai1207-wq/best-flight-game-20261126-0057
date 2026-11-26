// game/src/render.js — draws the sky, sea, islands, plane and objects for Sky Courier (~/workspace/makefun/flight-entry/)
// All art is drawn in code on a 2D canvas; no image files are loaded.

import { CONFIG, PALETTE, clamp, lerp } from './config.js';

function drawCloud(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 52 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 30 * s, y + 6 * s, 34 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 32 * s, y + 5 * s, 36 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPalm(ctx, x, y, s, sway) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway * 0.06);
  ctx.strokeStyle = PALETTE.palmTrunk;
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4 * s, -22 * s, 8 * s, -34 * s);
  ctx.stroke();
  ctx.fillStyle = PALETTE.palmLeaf;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.15 - (i * Math.PI) / 5.4;
    ctx.beginPath();
    ctx.ellipse(
      8 * s + Math.cos(a) * 18 * s,
      -34 * s + Math.sin(a) * 10 * s,
      20 * s,
      6 * s,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath();
  ctx.arc(10 * s, -30 * s, 4 * s, 0, Math.PI * 2);
  ctx.arc(16 * s, -27 * s, 3.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHouse(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.houseWall;
  ctx.fillRect(-14 * s, -18 * s, 28 * s, 18 * s);
  ctx.fillStyle = PALETTE.houseRoof;
  ctx.beginPath();
  ctx.moveTo(-17 * s, -18 * s);
  ctx.lineTo(0, -30 * s);
  ctx.lineTo(17 * s, -18 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(-4 * s, -10 * s, 8 * s, 10 * s);
  ctx.fillStyle = '#bfe6f7';
  ctx.fillRect(6 * s, -14 * s, 6 * s, 6 * s);
  ctx.restore();
}

function drawLighthouse(ctx, x, y, s, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PALETTE.lighthouse;
  ctx.beginPath();
  ctx.moveTo(-10 * s, 0);
  ctx.lineTo(-7 * s, -52 * s);
  ctx.lineTo(7 * s, -52 * s);
  ctx.lineTo(10 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.lighthouseRed;
  ctx.fillRect(-8.6 * s, -38 * s, 17.2 * s, 9 * s);
  ctx.fillRect(-8 * s, -16 * s, 16 * s, 9 * s);
  ctx.fillStyle = '#2e2a26';
  ctx.fillRect(-8 * s, -60 * s, 16 * s, 9 * s);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(0, -55 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  // Rotating light beam.
  const beam = (time * 0.7) % (Math.PI * 2);
  const grad = ctx.createLinearGradient(0, -55 * s, Math.cos(beam) * 190, -55 * s + Math.sin(beam) * 60);
  grad.addColorStop(0, 'rgba(255, 240, 170, 0.5)');
  grad.addColorStop(1, 'rgba(255, 240, 170, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -55 * s);
  ctx.lineTo(Math.cos(beam - 0.14) * 190, -55 * s + Math.sin(beam - 0.14) * 60);
  ctx.lineTo(Math.cos(beam + 0.14) * 190, -55 * s + Math.sin(beam + 0.14) * 60);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlane(ctx, plane, time) {
  const p = plane.state;
  ctx.save();
  ctx.translate(0, 0);
  ctx.rotate(-p.angle);
  // Pontoons (it is a seaplane).
  ctx.fillStyle = PALETTE.planeDark;
  ctx.fillRect(-26, 12, 44, 5);
  ctx.fillRect(-6, 14, 30, 4);
  // Fuselage.
  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(-34, 2);
  ctx.quadraticCurveTo(-30, -8, -8, -9);
  ctx.lineTo(26, -7);
  ctx.quadraticCurveTo(38, -4, 38, 0);
  ctx.quadraticCurveTo(38, 5, 26, 6);
  ctx.lineTo(-20, 8);
  ctx.quadraticCurveTo(-34, 7, -34, 2);
  ctx.closePath();
  ctx.fill();
  // Cream cheatline + cockpit.
  ctx.fillStyle = PALETTE.planeCream;
  ctx.fillRect(-8, -8, 26, 4);
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.ellipse(14, -8, 9, 6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // Tail.
  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(-32, -6);
  ctx.lineTo(-44, -20);
  ctx.lineTo(-34, -20);
  ctx.lineTo(-24, -7);
  ctx.closePath();
  ctx.fill();
  // Wing (top, toward viewer).
  ctx.fillStyle = '#c93320';
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(4, -26);
  ctx.lineTo(12, -26);
  ctx.lineTo(10, -7);
  ctx.closePath();
  ctx.fill();
  // Registration + mail star.
  ctx.fillStyle = PALETTE.planeCream;
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('KESTREL', -24, 4);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(30, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Spinning propeller.
  const spin = p.propAngle;
  ctx.strokeStyle = 'rgba(46, 42, 38, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(38 + Math.cos(spin) * 16, Math.sin(spin) * 16);
  ctx.lineTo(38 - Math.cos(spin) * 16, -Math.sin(spin) * 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(38, 0, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#2e2a26';
  ctx.fill();
  ctx.restore();
}

export function renderWorld(ctx, view) {
  const { world, plane, missions, cam, time } = view;
  const W = CONFIG.canvasW;
  const H = CONFIG.canvasH;
  // The sea line on screen: world altitude 0 sits here, and the camera's
  // vertical offset (cam.y, following the plane's climb) pushes it down.
  const seaTop = H - 190 + cam.y;
  const camX = cam.x;
  const camY = cam.y;

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(0.78, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun.
  const sunX = W - 180 - (camX * 0.02) % 60;
  const sunY = 92;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  sunGlow.addColorStop(0, 'rgba(255, 251, 232, 0.95)');
  sunGlow.addColorStop(0.35, 'rgba(255, 243, 196, 0.55)');
  sunGlow.addColorStop(1, 'rgba(255, 243, 196, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  // Clouds, three parallax layers: they drift across a fixed sky band,
  // slower than the world scrolls.
  for (const c of world.clouds) {
    const parallax = 0.25 + c.layer * 0.2;
    let sx = (c.x - camX * parallax) % (W + 320);
    if (sx < -160) sx += W + 320;
    const sy = 50 + ((c.y - 380) / 260) * 170 + c.layer * 26;
    drawCloud(ctx, sx, sy, c.s, 0.5 + c.layer * 0.16);
  }
  // Storm cells: dark bellies.
  for (const s of world.storms) {
    const sx = s.x - camX;
    const sy = s.y - camY;
    if (sx < -s.r - 40 || sx > W + s.r + 40) continue;
    ctx.fillStyle = 'rgba(70, 76, 92, 0.55)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, s.r * 0.62, s.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(52, 58, 74, 0.5)';
    ctx.beginPath();
    ctx.ellipse(sx - 60, sy + 26, s.r * 0.4, s.r * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 70, sy + 30, s.r * 0.42, s.r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sea: fills from the sea line down; its screen position follows cam.y.
  const sea = ctx.createLinearGradient(0, seaTop, 0, H);
  sea.addColorStop(0, PALETTE.seaShallow);
  sea.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, seaTop, W, H - seaTop);
  // Wave sparkle lines.
  ctx.strokeStyle = 'rgba(216, 242, 255, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const wx = ((i * 173 + time * 12 - camX * 0.9) % (W + 120) + W + 120) % (W + 120) - 60;
    const wy = seaTop + 26 + ((i * 47) % 170);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 14, wy - 4, wx + 30, wy);
    ctx.stroke();
  }

  // Islands (terrain polygons + decorations).
  for (const isl of world.islands) {
    const x0 = isl.x0 - camX;
    const x1 = isl.x1 - camX;
    if (x1 < -80 || x0 > W + 80) continue;
    ctx.beginPath();
    ctx.moveTo(x0 - 30, seaTop + 4);
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const wx = isl.x0 + ((isl.x1 - isl.x0) * i) / steps;
      const wy = seaTop - world.groundHeightAt(wx);
      ctx.lineTo(wx - camX, wy);
    }
    ctx.lineTo(x1 + 30, seaTop + 4);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, seaTop - isl.peak, 0, seaTop);
    g.addColorStop(0, PALETTE.grass);
    g.addColorStop(0.75, PALETTE.grassDark);
    g.addColorStop(1, PALETTE.rock);
    ctx.fillStyle = g;
    ctx.fill();
    // Sand fringe.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0 - 8, seaTop - 4, isl.x1 - isl.x0 + 16, 7);
    // Decorations.
    for (const px of isl.palmX) {
      drawPalm(ctx, px - camX, seaTop - world.groundHeightAt(px), 1, Math.sin(time * 1.3 + px));
    }
    for (const hx of isl.houseX) {
      drawHouse(ctx, hx - camX, seaTop - world.groundHeightAt(hx), 1);
    }
    if (isl.lighthouse) {
      drawLighthouse(ctx, isl.peakX - camX, seaTop - world.groundHeightAt(isl.peakX), 1.15, time);
    }
    // Island name.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '600 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(isl.name, (x0 + x1) / 2, seaTop - isl.peak - 26);
    ctx.textAlign = 'left';
  }

  // Runways.
  for (const rw of [world.startRunway, world.endRunway]) {
    const rx0 = rw.x0 - camX;
    const rx1 = rw.x1 - camX;
    if (rx1 < -40 || rx0 > W + 40) continue;
    const ry = seaTop - rw.y;
    ctx.fillStyle = PALETTE.runway;
    ctx.fillRect(rx0, ry, rx1 - rx0, 10);
    ctx.fillStyle = PALETTE.runwayLine;
    for (let x = rx0 + 18; x < rx1 - 18; x += 52) {
      ctx.fillRect(x, ry + 4, 30, 2.5);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rw === world.startRunway ? 'PALMQUAY' : 'HOME STRIP', (rx0 + rx1) / 2, ry - 10);
    ctx.textAlign = 'left';
  }

  // Drop zones.
  for (const z of world.dropZones) {
    const zx = z.x - camX;
    const zy = seaTop - world.groundHeightAt(z.x);
    if (zx < -120 || zx > W + 120) continue;
    ctx.save();
    ctx.translate(zx, zy);
    ctx.strokeStyle = z.done ? PALETTE.hudGreen : PALETTE.zone;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = z.done ? 'rgba(126, 231, 135, 0.25)' : 'rgba(255, 93, 93, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();
    // Checkered centre.
    for (let i = -2; i < 2; i++) {
      for (let j = -2; j < 2; j++) {
        if ((i + j) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(i * 12 - 24, j * 12 - 24, 12, 12);
        }
      }
    }
    ctx.fillStyle = z.done ? '#2f7d32' : '#a33';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.done ? 'DELIVERED ✓' : 'MAIL DROP', 0, -z.r - 10);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Fuel rings (green).
  for (const fr of world.fuelRings) {
    if (fr.hit) continue;
    const fx = fr.x - camX;
    const fy = seaTop - fr.y;
    if (fx < -80 || fx > W + 80) continue;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.strokeStyle = '#37c978';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, fr.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#37c978';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL', 0, 5);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // Golden rings.
  for (const ring of world.rings) {
    if (ring.hit) continue;
    const rx = ring.x - camX;
    const ry = seaTop - ring.y;
    if (rx < -100 || rx > W + 100) continue;
    const pulse = 1 + Math.sin(time * 3 + ring.x) * 0.06;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = PALETTE.ringGlow;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r - 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Birds.
  ctx.fillStyle = '#2e2a26';
  for (const b of world.birds) {
    const bx = b.x - camX;
    const by = seaTop - (b.y + Math.sin(b.phase) * b.amp);
    if (bx < -30 || bx > W + 30) continue;
    const flap = Math.sin(b.phase * 3) * 0.5;
    ctx.save();
    ctx.translate(bx, by);
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(-3, -6 - flap * 8, 0, 0);
    ctx.quadraticCurveTo(3, -6 - flap * 8, 9, 0);
    ctx.quadraticCurveTo(3, 2, 0, 1);
    ctx.quadraticCurveTo(-3, 2, -9, 0);
    ctx.fill();
    ctx.restore();
  }

  // Falling parcels.
  for (const parcel of missions.state.parcels) {
    const px = parcel.x - camX;
    const py = seaTop - parcel.y;
    if (px < -40 || px > W + 40) continue;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(parcel.spin * 0.4);
    ctx.fillStyle = '#c98a3d';
    ctx.fillRect(-9, -7, 18, 14);
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -7, 18, 14);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.restore();
    // Little parachute puff.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(px, py - 16, 10, Math.PI, 0);
    ctx.fill();
  }

  // The plane itself, drawn at its screen position.
  const p = plane.state;
  const px = p.x - camX;
  const py = seaTop - p.y;
  ctx.save();
  ctx.translate(px, py);
  drawPlane(ctx, plane, time);
  ctx.restore();

  // Stall warning shimmer.
  if (p.airborne && p.speed < CONFIG.stallSpeed && !p.crashed) {
    ctx.fillStyle = 'rgba(255, 107, 94, ' + (0.5 + Math.sin(time * 8) * 0.3) + ')';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — PUSH THE THROTTLE', W / 2, 108);
    ctx.textAlign = 'left';
  }
}
