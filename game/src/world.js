// game/src/world.js — the Coral Isles: terrain, islands, rings, zones, birds, clouds (~/workspace/makefun/flight-entry/)
// The whole archipelago is generated from one seed so every flight sees the same islands.

import { CONFIG, mulberry32, clamp } from './config.js';

function smoothstep(a, b, t) {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

export function createWorld(seed) {
  const rnd = mulberry32(seed || 20261126);

  // Islands: x-range, peak height, name, what stands on it.
  const islands = [
    { x0: 0, x1: 1000, peak: 46, name: 'Palmquay', palms: 5, houses: 3, lighthouse: false, runway: true },
    { x0: 2100, x1: 2900, peak: 120, name: 'Tern Rock', palms: 3, houses: 1, lighthouse: false, runway: false },
    { x0: 4000, x1: 5100, peak: 150, name: 'Lighthouse Point', palms: 4, houses: 2, lighthouse: true, runway: false },
    { x0: 6400, x1: 7600, peak: 110, name: 'Coral Bay', palms: 6, houses: 4, lighthouse: false, runway: false },
    { x0: 8900, x1: 9900, peak: 170, name: 'Gullnest', palms: 4, houses: 2, lighthouse: false, runway: false },
    { x0: 11300, x1: 12500, peak: 130, name: 'Farhaven', palms: 5, houses: 3, lighthouse: false, runway: false },
    { x0: 13000, x1: 14000, peak: 46, name: 'Home Strip', palms: 3, houses: 2, lighthouse: false, runway: true },
  ];

  // Decorations per island, placed with the seeded random.
  for (const isl of islands) {
    isl.palmX = [];
    isl.houseX = [];
    for (let i = 0; i < isl.palms; i++) {
      isl.palmX.push(isl.x0 + 120 + rnd() * (isl.x1 - isl.x0 - 240));
    }
    for (let i = 0; i < isl.houses; i++) {
      isl.houseX.push(isl.x0 + 160 + rnd() * (isl.x1 - isl.x0 - 320));
    }
    isl.peakX = isl.x0 + (isl.x1 - isl.x0) * (0.35 + rnd() * 0.3);
  }

  // Golden rings to fly through, strung between the islands.
  const rings = [
    { x: 1500, y: 260, r: 52, hit: false },
    { x: 3450, y: 330, r: 52, hit: false },
    { x: 6900, y: 290, r: 52, hit: false },
    { x: 8200, y: 350, r: 52, hit: false },
    { x: 10600, y: 300, r: 52, hit: false },
  ];

  // Mail drop zones: flat checkered circles on three islands.
  const dropZones = [
    { x: 4550, y: 0, r: 70, name: 'Lighthouse Point', done: false },
    { x: 7000, y: 0, r: 70, name: 'Coral Bay', done: false },
    { x: 11900, y: 0, r: 70, name: 'Farhaven', done: false },
  ];

  // Fuel rings: small green rings that top the tank up.
  const fuelRings = [
    { x: 2650, y: 200, r: 34, hit: false },
    { x: 9500, y: 240, r: 34, hit: false },
  ];

  // Birds: gentle moving hazards with a sine wobble.
  const birds = [];
  for (let i = 0; i < CONFIG.birdCount; i++) {
    birds.push({
      x: 1800 + i * 1350 + rnd() * 500,
      y: 180 + rnd() * 260,
      vx: -(14 + rnd() * 16),
      phase: rnd() * Math.PI * 2,
      amp: 18 + rnd() * 22,
    });
  }

  // Decorative clouds in three parallax layers, plus two storm cells.
  const clouds = [];
  for (let i = 0; i < CONFIG.cloudCount; i++) {
    clouds.push({
      x: rnd() * CONFIG.worldLength,
      y: 380 + rnd() * 260,
      s: 0.7 + rnd() * 1.1,
      layer: i % 3,
      drift: 4 + rnd() * 7,
    });
  }
  const storms = [
    { x: 5200, y: 420, r: 260 },
    { x: 10100, y: 400, r: 300 },
  ];

  const startRunway = { x0: 180, x1: 900, y: 46 };
  const endRunway = { x0: 13100, x1: 13900, y: 46 };

  // Terrain height: smooth hills on islands, sea (0) everywhere else.
  function groundHeightAt(x) {
    for (const isl of islands) {
      if (x >= isl.x0 && x <= isl.x1) {
        if (isl.runway) return isl.peak;
        const t = (x - isl.x0) / (isl.x1 - isl.x0);
        const hill = Math.sin(t * Math.PI);
        const bump =
          0.75 + 0.25 * Math.sin(t * Math.PI * 3 + isl.x0 * 0.01);
        return isl.peak * hill * bump;
      }
    }
    return 0;
  }

  function islandAt(x) {
    for (const isl of islands) {
      if (x >= isl.x0 && x <= isl.x1) return isl;
    }
    return null;
  }

  function onRunway(x) {
    if (x >= startRunway.x0 && x <= startRunway.x1) return startRunway;
    if (x >= endRunway.x0 && x <= endRunway.x1) return endRunway;
    return null;
  }

  function inStorm(x, y) {
    for (const s of storms) {
      const dx = (x - s.x) / s.r;
      const dy = (y - s.y) / (s.r * 0.7);
      if (dx * dx + dy * dy < 1) return s;
    }
    return null;
  }

  return {
    islands,
    rings,
    dropZones,
    fuelRings,
    birds,
    clouds,
    storms,
    startRunway,
    endRunway,
    groundHeightAt,
    islandAt,
    onRunway,
    inStorm,
    update(dt) {
      for (const b of birds) {
        b.x += b.vx * dt;
        b.phase += dt * 2.2;
        if (b.x < -60) b.x = CONFIG.worldLength + 40;
      }
      for (const c of clouds) {
        c.x += c.drift * dt;
        if (c.x > CONFIG.worldLength + 200) c.x = -200;
      }
    },
  };
}
