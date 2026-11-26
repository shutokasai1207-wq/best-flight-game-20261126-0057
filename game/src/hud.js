// game/src/hud.js — instruments, mission list and screens for Sky Courier (~/workspace/makefun/flight-entry/)
// The HUD is drawn on the canvas so it reads in screenshots: airspeed and altitude
// dials, a heading compass, fuel, score, timer and the sortie checklist.

import { CONFIG, PALETTE, formatTime, clamp } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.strokeStyle = PALETTE.hudEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function dial(ctx, cx, cy, r, label, value, max, unit, danger) {
  ctx.save();
  ctx.translate(cx, cy);
  panel(ctx, -r - 10, -r - 10, (r + 10) * 2, (r + 10) * 2 + 22);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 16, 26, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Ticks.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const inner = r - 9;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.strokeStyle = i >= 8 ? PALETTE.hudRed : 'rgba(255,255,255,0.6)';
    ctx.lineWidth = i % 5 === 0 ? 3 : 1.5;
    ctx.stroke();
  }
  const frac = clamp(value / max, 0, 1);
  const a = Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = danger ? PALETTE.hudRed : PALETTE.hudAmber;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(value)), 0, 7);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = 'rgba(242, 247, 250, 0.75)';
  ctx.fillText(unit, 0, r - 2);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(label, 0, r + 16);
  ctx.restore();
  ctx.textAlign = 'left';
}

function compass(ctx, cx, y, heading) {
  const w = 340;
  panel(ctx, cx - w / 2, y, w, 44);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y, w, 44, 10);
  ctx.clip();
  const points = [
    { deg: 0, label: 'N' },
    { deg: 45, label: 'NE' },
    { deg: 90, label: 'E' },
    { deg: 135, label: 'SE' },
    { deg: 180, label: 'S' },
    { deg: 225, label: 'SW' },
    { deg: 270, label: 'W' },
    { deg: 315, label: 'NW' },
  ];
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const p of points) {
    let d = ((p.deg - heading) % 360 + 540) % 360 - 180;
    const x = cx + (d / 60) * (w / 2);
    if (x < cx - w / 2 + 8 || x > cx + w / 2 - 8) continue;
    ctx.fillStyle = p.label.length === 1 ? PALETTE.hudAmber : PALETTE.hudText;
    ctx.fillText(p.label, x, y + 27);
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.hudRed;
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 2);
  ctx.lineTo(cx + 6, y + 2);
  ctx.lineTo(cx, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HDG ' + String(Math.round(((heading % 360) + 360) % 360)).padStart(3, '0') + '°', cx, y + 40);
  ctx.textAlign = 'left';
}

export function renderHud(ctx, view) {
  const { plane, missions, time } = view;
  const p = plane.state;
  const m = missions.state;
  const W = CONFIG.canvasW;

  // Left: airspeed + altitude dials.
  const speedKts = Math.round(p.speed * 0.9);
  const altFt = Math.round(p.y * 3.2);
  dial(ctx, 78, 82, 46, 'AIRSPEED', speedKts, 260, 'KT');
  dial(ctx, 196, 82, 46, 'ALTITUDE', altFt, 2000, 'FT', p.y < 40 && p.airborne);

  // Centre: compass.
  const heading = 90 - (p.angle * 180) / Math.PI;
  compass(ctx, W / 2, 16, heading);

  // Right: score, timer, fuel, damage.
  panel(ctx, W - 268, 16, 252, 108);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SCORE', W - 252, 38);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillText(String(m.score), W - 252, 66);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('TIME', W - 150, 38);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = m.timeLeft < 30 ? PALETTE.hudRed : PALETTE.hudText;
  ctx.fillText(formatTime(m.timeLeft), W - 150, 66);
  // Fuel bar.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W - 252, 78, 220, 12);
  ctx.fillStyle = p.fuel < 25 ? PALETTE.hudRed : PALETTE.hudGreen;
  ctx.fillRect(W - 252, 78, 220 * clamp(p.fuel / CONFIG.fuelMax, 0, 1), 12);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FUEL ' + Math.round(p.fuel) + '%', W - 252, 106);
  // Damage bar.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W - 252, 110, 220, 6);
  ctx.fillStyle = p.damage > 60 ? PALETTE.hudRed : PALETTE.hudAmber;
  ctx.fillRect(W - 252, 110, 220 * clamp(p.damage / CONFIG.damageMax, 0, 1), 6);

  // Bottom-left: sortie checklist.
  const steps = [
    { key: 'takeoff', label: '1 · Take off from Palmquay' },
    { key: 'rings', label: '2 · Fly the 5 golden rings (' + m.ringsHit + '/5)' },
    { key: 'mail', label: '3 · Drop mail (' + m.parcelsDelivered + '/3) — Space / click' },
    { key: 'land', label: '4 · Land at Home Strip' },
  ];
  const order = ['takeoff', 'rings', 'mail', 'land'];
  panel(ctx, 16, CONFIG.canvasH - 118, 330, 102);
  ctx.font = 'bold 13px sans-serif';
  steps.forEach((s, i) => {
    const done = order.indexOf(m.phase) > i || (m.finished && m.success);
    const active = m.phase === s.key;
    ctx.fillStyle = done ? PALETTE.hudGreen : active ? PALETTE.hudAmber : 'rgba(242,247,250,0.6)';
    ctx.fillText((done ? '✓ ' : active ? '▸ ' : '· ') + s.label, 30, CONFIG.canvasH - 92 + i * 22);
  });
  ctx.fillStyle = 'rgba(242,247,250,0.75)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Parcels left: ' + m.parcelsLeft + (m.combo > 1 ? '   COMBO x' + m.combo : ''), 30, CONFIG.canvasH - 92 + 4 * 22 - 4);

  // Floating notices.
  ctx.textAlign = 'center';
  m.messages.forEach((msg, i) => {
    ctx.globalAlpha = clamp(msg.t, 0, 1);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(msg.text, W / 2, 150 + i * 30);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  // Throttle indicator, bottom-right.
  panel(ctx, W - 168, CONFIG.canvasH - 62, 152, 46);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('THROTTLE ' + Math.round(p.throttle * 100) + '%', W - 156, CONFIG.canvasH - 42);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(W - 156, CONFIG.canvasH - 34, 128, 8);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillRect(W - 156, CONFIG.canvasH - 34, 128 * p.throttle, 8);
}

export function renderTitle(ctx, view) {
  const W = CONFIG.canvasW;
  const H = CONFIG.canvasH;
  const { time } = view;
  ctx.fillStyle = 'rgba(8, 20, 34, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3c4';
  ctx.font = '900 84px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 12;
  ctx.fillText('SKY COURIER', W / 2, 168);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 30px sans-serif';
  ctx.fillText('— Coral Isles Mail Run —', W / 2, 214);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(242, 247, 250, 0.9)';
  ctx.fillText('Fly the Kestrel across six islands: rings, mail drops, and one careful landing.', W / 2, 252);
  panel(ctx, W / 2 - 300, 292, 600, 150);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('HOW TO FLY', W / 2, 322);
  ctx.font = '15px sans-serif';
  const lines = [
    '↑ / W climb      ↓ / S descend      → / D throttle up      ← / A throttle down',
    'SPACE or CLICK — drop a mail parcel over a red zone',
    'Fly the golden rings · green rings refuel · mind the birds and the storms',
    'P pause · M mute · ENTER start',
  ];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, 350 + i * 24));
  const pulse = 0.65 + Math.sin(time * 3) * 0.35;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PRESS ENTER TO FLY', W / 2, 500);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(242,247,250,0.7)';
  ctx.font = '13px sans-serif';
  ctx.fillText('4 minutes on the clock · a full flight scores up to 1,000+', W / 2, 534);
  ctx.textAlign = 'left';
}

export function renderPause(ctx) {
  const W = CONFIG.canvasW;
  const H = CONFIG.canvasH;
  ctx.fillStyle = 'rgba(8, 20, 34, 0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '900 56px sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 10);
  ctx.font = '18px sans-serif';
  ctx.fillText('P to resume · R to restart the flight', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}

export function renderResults(ctx, view) {
  const { missions, plane } = view;
  const m = missions.state;
  const p = plane.state;
  const W = CONFIG.canvasW;
  const H = CONFIG.canvasH;
  ctx.fillStyle = 'rgba(8, 20, 34, 0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = m.success ? PALETTE.hudGreen : PALETTE.hudRed;
  ctx.font = '900 58px sans-serif';
  ctx.fillText(m.success ? 'MAIL DELIVERED!' : 'FLIGHT OVER', W / 2, 150);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '20px sans-serif';
  if (!m.success) {
    const why = p.crashReason === 'sea' ? 'ditched in the sea'
      : p.crashReason === 'terrain' ? 'hit the terrain'
      : p.crashReason === 'birds' ? 'taken down by birds'
      : p.crashReason === 'storm' ? 'lost in a storm'
      : p.crashReason === 'hard landing' ? 'a hard landing'
      : "out of time";
    ctx.fillText('The Kestrel was ' + why + '. The mail will fly again.', W / 2, 188);
  } else {
    ctx.fillText('Every parcel home, wheels down at Home Strip. Pip salutes you.', W / 2, 188);
  }
  panel(ctx, W / 2 - 260, 220, 520, 232);
  const rows = [
    ['Rings flown', m.stats.rings + ' × 50', m.stats.rings * 50],
    ['Parcels delivered', m.stats.drops + ' × 100+', m.stats.drops * 100],
    ['Landing bonus', m.success ? '200' : '0', m.success ? 200 : 0],
    ['Time bonus', m.stats.timeBonus, m.stats.timeBonus],
    ['Fuel bonus', m.stats.fuelBonus, m.stats.fuelBonus],
  ];
  ctx.font = '16px sans-serif';
  rows.forEach((row, i) => {
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'left';
    ctx.fillText(row[0], W / 2 - 236, 252 + i * 32);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.fillText(String(row[2]), W / 2 + 236, 252 + i * 32);
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 236, 252 + 5 * 32 - 12);
  ctx.lineTo(W / 2 + 236, 252 + 5 * 32 - 12);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', W / 2 - 236, 252 + 5 * 32 + 18);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillText(String(m.score), W / 2 + 236, 252 + 5 * 32 + 18);
  ctx.textAlign = 'center';
  ctx.fillStyle = m.success ? PALETTE.hudGreen : PALETTE.hudText;
  ctx.font = '900 44px sans-serif';
  ctx.fillText('GRADE ' + m.grade, W / 2, 492);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '18px sans-serif';
  ctx.fillText('R to fly again · ENTER for a new flight', W / 2, 530);
  ctx.textAlign = 'left';
}
