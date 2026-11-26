// game/src/config.js — tuning, palette and names for Sky Courier (~/workspace/makefun/flight-entry/)
// Everything the other modules share lives here so the game can be tuned in one place.

export const CONFIG = {
  canvasW: 1280,
  canvasH: 720,
  worldLength: 14000,
  seaLevel: 0,
  // Flight model (arcade, units are px and seconds)
  maxSpeed: 260,
  minSpeed: 55,
  cruiseSpeed: 150,
  accel: 90,
  climbRate: 1.5, // radians per second of pitch change
  maxPitch: 0.85,
  stallSpeed: 78, // below this the plane starts to sink
  sinkRate: 130,
  takeoffSpeed: 115,
  // Resources
  fuelMax: 100,
  fuelDrain: 1.05, // per second at full throttle
  fuelRingBonus: 26,
  damageMax: 100,
  // Mission
  flightTime: 240, // seconds on the clock
  ringCount: 5,
  parcelCount: 3,
  ringScore: 50,
  parcelScore: 100,
  parcelBonusMax: 50,
  landScore: 200,
  comboWindow: 8, // seconds to keep a ring combo alive
  // Camera
  camLeadX: 0.34, // plane sits this far across the screen
  camLeadY: 0.58,
  // Ambience
  birdCount: 9,
  cloudCount: 26,
  stormDamagePerSec: 4,
  birdDamage: 15,
};

export const PALETTE = {
  skyTop: '#7ec8f2',
  skyMid: '#bfe6f7',
  skyLow: '#ffe9b8',
  sun: '#fff3c4',
  sunCore: '#fffbe8',
  seaDeep: '#14608f',
  seaShallow: '#2f8fbd',
  seaFoam: '#d8f2ff',
  sand: '#f2dd9e',
  grass: '#5da24a',
  grassDark: '#437c36',
  rock: '#8a7a68',
  rockDark: '#6b5d4f',
  palmTrunk: '#7a5230',
  palmLeaf: '#3f8f3a',
  houseWall: '#fff4dd',
  houseRoof: '#d95f4b',
  lighthouse: '#f4f1e6',
  lighthouseRed: '#d9453a',
  runway: '#3c4148',
  runwayLine: '#f5f0dc',
  ring: '#ffc93c',
  ringGlow: '#ffdf7a',
  zone: '#ff5d5d',
  zoneRing: '#ffffff',
  planeRed: '#e8442e',
  planeCream: '#fff3d6',
  planeDark: '#2e2a26',
  hudBg: 'rgba(12, 26, 40, 0.72)',
  hudEdge: 'rgba(255, 255, 255, 0.25)',
  hudText: '#f2f7fa',
  hudAmber: '#ffc93c',
  hudGreen: '#7ee787',
  hudRed: '#ff6b5e',
};

export const ISLAND_NAMES = [
  'Palmquay',
  'Tern Rock',
  'Lighthouse Point',
  'Coral Bay',
  'Gullnest',
  'Farhaven',
];

export const PLANE_NAME = 'Kestrel';
export const PILOT_NAME = 'Pip';
export const GAME_TITLE = 'SKY COURIER';
export const GAME_SUBTITLE = 'Coral Isles Mail Run';

// Deterministic random: the same seed always builds the same islands.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
