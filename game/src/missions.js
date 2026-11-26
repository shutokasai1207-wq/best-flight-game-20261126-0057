// game/src/missions.js — sorties, scoring and the mail parcels for Sky Courier (~/workspace/makefun/flight-entry/)
// One flight is four sorties: take off, fly the rings, drop the mail, land at Home Strip.

import { CONFIG, clamp } from './config.js';

export function createMissions(world, plane) {
  const m = {
    phase: 'takeoff', // takeoff | rings | mail | land | done
    ringsHit: 0,
    parcelsLeft: CONFIG.parcelCount,
    parcelsDelivered: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    timeLeft: CONFIG.flightTime,
    parcels: [], // falling parcels {x, y, vy, zone}
    messages: [], // {text, t} floating notices
    finished: false,
    success: false,
    grade: '',
    fuelWarnedAt: -100, // last time (seconds left) the low-fuel beep sounded
    stats: { rings: 0, drops: 0, landBonus: 0, timeBonus: 0, fuelBonus: 0 },
  };

  function notice(text) {
    m.messages.push({ text, t: 3.2 });
    if (m.messages.length > 4) m.messages.shift();
  }

  function gradeFor(score, success) {
    if (!success) return '—';
    if (score >= 950) return 'S';
    if (score >= 750) return 'A';
    if (score >= 550) return 'B';
    return 'C';
  }

  function finish(success) {
    if (m.finished) return;
    m.finished = true;
    m.success = success;
    m.phase = 'done';
    if (success) {
      m.stats.timeBonus = Math.round(m.timeLeft * 2);
      m.stats.fuelBonus = Math.round(plane.state.fuel * 2);
      m.score += m.stats.timeBonus + m.stats.fuelBonus;
    }
    m.grade = gradeFor(m.score, success);
  }

  function dropParcel() {
    if (m.phase !== 'mail' && m.phase !== 'rings') return false;
    if (m.parcelsLeft <= 0) return false;
    if (!plane.state.airborne) return false;
    m.parcelsLeft--;
    m.parcels.push({
      x: plane.state.x,
      y: plane.state.y - 10,
      vy: -8,
      spin: 0,
    });
    return true;
  }

  function update(dt, audio) {
    if (m.finished) return;

    m.timeLeft -= dt;
    if (m.timeLeft <= 0) {
      m.timeLeft = 0;
      notice("Time's up — the mail is late!");
      finish(false);
      return;
    }

    if (m.comboTimer > 0) {
      m.comboTimer -= dt;
      if (m.comboTimer <= 0) m.combo = 0;
    }

    // Low-fuel warning: beep and flash a notice every 10 seconds of flight time.
    const p0 = plane.state;
    if (p0.fuel < 20 && p0.airborne && m.timeLeft < m.fuelWarnedAt - 10) {
      m.fuelWarnedAt = m.timeLeft;
      notice('LOW FUEL — find a green ring!');
      if (audio) audio.fuelWarn();
    }

    for (const msg of m.messages) msg.t -= dt;
    m.messages = m.messages.filter((msg) => msg.t > 0);

    const p = plane.state;

    // Sortie 1: take off.
    if (m.phase === 'takeoff' && p.airborne) {
      m.phase = 'rings';
      m.score += 25;
      notice('Airborne! Fly the golden rings.');
      if (audio) audio.score();
    }

    // Sortie 2: rings (and fuel rings along the way).
    if (m.phase === 'rings' || m.phase === 'mail') {
      for (const ring of world.rings) {
        if (ring.hit) continue;
        const dx = p.x - ring.x;
        const dy = p.y - ring.y;
        if (dx * dx + dy * dy < ring.r * ring.r) {
          ring.hit = true;
          m.ringsHit++;
          m.stats.rings++;
          m.combo = Math.min(m.combo + 1, 4);
          m.comboTimer = CONFIG.comboWindow;
          const gained = CONFIG.ringScore * m.combo;
          m.score += gained;
          notice('Ring! +' + gained + (m.combo > 1 ? '  COMBO x' + m.combo : ''));
          if (audio) {
            if (m.combo > 1) audio.combo(m.combo);
            else audio.ring();
          }
        }
      }
      for (const fr of world.fuelRings) {
        if (fr.hit) continue;
        const dx = p.x - fr.x;
        const dy = p.y - fr.y;
        if (dx * dx + dy * dy < fr.r * fr.r) {
          fr.hit = true;
          p.fuel = clamp(p.fuel + CONFIG.fuelRingBonus, 0, CONFIG.fuelMax);
          notice('Fuel + ' + CONFIG.fuelRingBonus);
          if (audio) audio.score();
        }
      }
    }

    // Move to the mail sortie once all rings are flown (or the plane passes them).
    if (m.phase === 'rings' && m.ringsHit >= CONFIG.ringCount) {
      m.phase = 'mail';
      notice('Rings done! Drop the mail on the red zones.');
    } else if (m.phase === 'rings' && p.x > 11200) {
      m.phase = 'mail';
      notice('Mail run! Drop the mail on the red zones.');
    }

    // Falling parcels.
    for (const parcel of m.parcels) {
      parcel.vy -= 260 * dt; // gravity pulls the parcel down (y is up-positive)
      parcel.vy = Math.max(parcel.vy, -260);
      parcel.y += parcel.vy * dt;
      parcel.x += p.speed * 0.12 * dt;
      parcel.spin += dt * 6;
      const ground = world.groundHeightAt(parcel.x);
      if (parcel.y <= ground + 6) {
        parcel.landed = true;
        let best = null;
        let bestDist = 1e9;
        for (const z of world.dropZones) {
          const d = Math.abs(parcel.x - z.x);
          if (d < bestDist) {
            bestDist = d;
            best = z;
          }
        }
        if (best && !best.done && bestDist <= best.r) {
          best.done = true;
          m.parcelsDelivered++;
          m.stats.drops++;
          const accuracy = 1 - bestDist / best.r;
          const gained = CONFIG.parcelScore + Math.round(CONFIG.parcelBonusMax * accuracy);
          m.score += gained;
          notice('Mail delivered at ' + best.name + '! +' + gained);
          if (audio) audio.thud();
          if (audio) setTimeout(() => audio.score(), 120);
        } else {
          notice('Parcel lost in the drink…');
        }
      }
    }
    m.parcels = m.parcels.filter((parcel) => !parcel.landed);

    // All mail delivered (or parcels spent) -> head for Home Strip.
    if (m.phase === 'mail' && (m.parcelsDelivered >= CONFIG.parcelCount || (m.parcelsLeft === 0 && m.parcels.length === 0))) {
      if (m.parcelsDelivered >= CONFIG.parcelCount) {
        m.phase = 'land';
        notice('All mail delivered! Land at Home Strip.');
      } else {
        m.phase = 'land';
        notice('Out of parcels — land at Home Strip.');
      }
    }

    // Past the last drop zone with mail still aboard: the run is over,
    // head for Home Strip instead of flying on forever.
    if (m.phase === 'mail' && p.x > 12650) {
      m.phase = 'land';
      notice('Mail run over — land at Home Strip.');
    }

    // Landing completes the flight — but only when the sortie says so.
    // Touching down early (a touch-and-go) just lets the pilot take off again.
    if (p.landed && !m.finished && m.phase === 'land') {
      m.stats.landBonus = CONFIG.landScore;
      m.score += CONFIG.landScore;
      if (audio) audio.land();
      finish(true);
    }
    if (p.crashed && !m.finished) {
      if (audio) audio.crash();
      finish(false);
    }
    if (p.fuel <= 0 && p.onGround && !p.airborne && !m.finished && m.phase !== 'takeoff') {
      notice('Out of fuel on the ground.');
      finish(false);
    }
  }

  return { state: m, update, dropParcel, finish, notice };
}
