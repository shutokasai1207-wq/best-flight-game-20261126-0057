// game/src/plane.js — the seaplane "Kestrel": arcade flight model for Sky Courier (~/workspace/makefun/flight-entry/)
// Speed follows throttle, pitch follows the elevator keys, and slow flight sinks (stall).

import { CONFIG, clamp } from './config.js';

export function createPlane(world) {
  const start = world.startRunway;
  const plane = {
    x: start.x0 + 120,
    y: start.y + 14,
    angle: 0, // pitch, radians; positive = nose up
    speed: 0,
    throttle: 0,
    fuel: CONFIG.fuelMax,
    damage: 0,
    airborne: false,
    landed: false,
    crashed: false,
    crashReason: '',
    propAngle: 0,
    onGround: true,
    airTime: 0, // seconds since lift-off; landings only count after a real flight
    softTouch: 0, // counts gentle runway contacts for landing detection
  };

  function reset() {
    plane.x = start.x0 + 120;
    plane.y = start.y + 14;
    plane.angle = 0;
    plane.speed = 0;
    plane.throttle = 0;
    plane.fuel = CONFIG.fuelMax;
    plane.damage = 0;
    plane.airborne = false;
    plane.landed = false;
    plane.crashed = false;
    plane.crashReason = '';
    plane.onGround = true;
    plane.airTime = 0;
    plane.softTouch = 0;
  }

  // Returns an event string ('takeoff', 'crash', 'bird', 'landed') or ''.
  function update(dt, input, world, events) {
    if (plane.crashed) {
      plane.propAngle += dt * (2 + plane.throttle * 20);
      return '';
    }
    if (plane.landed) {
      plane.propAngle += dt * (2 + plane.throttle * 20);
      // A plane that has landed may take off again — unless the flight is
      // already over, throttling up on the strip starts a new take-off roll.
      if (input.anyDown(['ArrowRight', 'KeyD']) && plane.throttle > 0.4) {
        plane.landed = false;
        plane.airTime = 0;
        plane.softTouch = 0;
      } else {
        return '';
      }
    }

    const climb = input.anyDown(['ArrowUp', 'KeyW']);
    const descend = input.anyDown(['ArrowDown', 'KeyS']);
    const throttleUp = input.anyDown(['ArrowRight', 'KeyD']);
    const throttleDown = input.anyDown(['ArrowLeft', 'KeyA']);

    if (throttleUp) plane.throttle = clamp(plane.throttle + dt * 0.7, 0, 1);
    if (throttleDown) plane.throttle = clamp(plane.throttle - dt * 0.9, 0, 1);

    // Pitch bites once there is airflow; on the ground the nose stays level
    // until the plane is fast enough to rotate for take-off.
    const canRotate = plane.airborne || plane.speed > 80;
    if (canRotate) {
      if (climb) plane.angle = clamp(plane.angle + CONFIG.climbRate * dt, -CONFIG.maxPitch, CONFIG.maxPitch);
      if (descend) plane.angle = clamp(plane.angle - CONFIG.climbRate * dt, -CONFIG.maxPitch, CONFIG.maxPitch);
      // Gentle auto-level so the plane does not hold a wild attitude forever.
      if (!climb && !descend && plane.airborne) plane.angle *= Math.pow(0.55, dt);
    } else {
      plane.angle = 0;
    }

    const targetSpeed = 40 + plane.throttle * (CONFIG.maxSpeed - 40);
    plane.speed += (targetSpeed - plane.speed) * Math.min(1, (CONFIG.accel / 160) * dt * 2.2);
    if (plane.speed > targetSpeed) plane.speed = Math.max(targetSpeed, plane.speed - 60 * dt);

    // Fuel drains with throttle; empty tank means gliding only.
    if (plane.fuel > 0) {
      plane.fuel = Math.max(0, plane.fuel - CONFIG.fuelDrain * plane.throttle * dt);
      if (plane.fuel <= 0) plane.throttle = Math.max(0, plane.throttle - dt * 0.5);
    }

    const vx = Math.cos(plane.angle) * plane.speed;
    let vy = Math.sin(plane.angle) * plane.speed;
    // Stall: below stall speed the wing gives up and the plane sinks.
    if (plane.airborne && plane.speed < CONFIG.stallSpeed) {
      const sink = (CONFIG.stallSpeed - plane.speed) * 1.6;
      vy -= sink;
      plane.angle = Math.max(plane.angle - dt * 0.7, -0.5);
    }

    plane.x += vx * dt;
    plane.y += vy * dt;
    plane.propAngle += dt * (4 + plane.throttle * 42 + plane.speed * 0.12);
    if (plane.airborne) plane.airTime += dt;

    // Lift-off: fast, nose up, and actually off the ground.
    if (!plane.airborne && plane.speed >= CONFIG.takeoffSpeed && plane.y > world.groundHeightAt(plane.x) + 4) {
      plane.airborne = true;
      plane.airTime = 0;
      return 'takeoff';
    }

    // World bounds: the sea stretches past both runways, so turn the plane around.
    if (plane.x < 60) {
      plane.x = 60;
      plane.speed *= 0.6;
    }
    if (plane.x > CONFIG.worldLength - 60) {
      plane.x = CONFIG.worldLength - 60;
      plane.speed *= 0.6;
    }
    // Ceiling.
    if (plane.y > 620) {
      plane.y = 620;
      plane.angle = Math.min(plane.angle, 0);
    }

    // Ground / sea contact.
    const ground = world.groundHeightAt(plane.x);
    if (plane.y <= ground + 12) {
      const runway = world.onRunway(plane.x);
      const impactSpeed = -vy;
      plane.y = ground + 12;
      if (runway) {
        // A real landing: airborne a while, descending gently, slow enough.
        // A feather-soft touchdown (almost no sink rate) counts too once the
        // plane is rolling on the strip — it got there by flying.
        const gentle = plane.airTime > 2 && impactSpeed < 65 && Math.abs(plane.angle) < 0.32 && plane.speed < 190;
        if (plane.airborne && gentle && impactSpeed > 4) {
          plane.softTouch++;
          if (plane.softTouch >= 2) {
            plane.landed = true;
            plane.onGround = true;
            plane.airborne = false;
            return 'landed';
          }
        } else if (!plane.airborne && gentle) {
          plane.softTouch++;
          if (plane.softTouch >= 2) {
            plane.landed = true;
            plane.onGround = true;
            plane.airborne = false;
            return 'landed';
          }
        } else if (plane.airborne && impactSpeed >= 65) {
          plane.crashed = true;
          plane.crashReason = 'hard landing';
          return 'crash';
        }
        // Otherwise just rolling along the runway (take-off roll or taxi).
        plane.airborne = false;
        plane.onGround = true;
        if (plane.speed < 30) plane.angle = 0;
      } else if (ground > 0) {
        // Land: a soft belly landing slides on, a hard one ends the flight.
        if (plane.airborne && impactSpeed < 45) {
          plane.damage = Math.min(CONFIG.damageMax, plane.damage + 30);
          plane.speed *= 0.45;
          plane.angle = 0;
          plane.airborne = false;
          plane.onGround = true;
          return 'rough';
        } else if (plane.airborne) {
          plane.crashed = true;
          plane.crashReason = 'terrain';
          return 'crash';
        }
        plane.onGround = true;
        plane.airborne = false;
      } else {
        // The sea: any airborne contact with the water is a ditching.
        if (plane.airborne) {
          plane.crashed = true;
          plane.crashReason = 'sea';
          return 'crash';
        }
        plane.onGround = true;
        plane.airborne = false;
      }
    } else {
      plane.onGround = false;
      plane.softTouch = 0;
    }

    // Birds: a hit costs damage and speed.
    for (const b of world.birds) {
      const dx = plane.x - b.x;
      const dy = plane.y - (b.y + Math.sin(b.phase) * b.amp);
      if (dx * dx + dy * dy < 26 * 26) {
        plane.damage = Math.min(CONFIG.damageMax, plane.damage + CONFIG.birdDamage);
        plane.speed *= 0.75;
        b.x += 900; // the bird is scared far away
        if (plane.damage >= CONFIG.damageMax) {
          plane.crashed = true;
          plane.crashReason = 'birds';
          return 'crash';
        }
        return 'bird';
      }
    }

    // Storm cells shake the plane and slowly wear it down.
    const storm = world.inStorm(plane.x, plane.y);
    if (storm && plane.airborne) {
      plane.angle += (Math.random() - 0.5) * 1.4 * dt;
      plane.damage = Math.min(CONFIG.damageMax, plane.damage + CONFIG.stormDamagePerSec * dt);
      if (plane.damage >= CONFIG.damageMax) {
        plane.crashed = true;
        plane.crashReason = 'storm';
        return 'crash';
      }
    }

    return '';
  }

  return { state: plane, update, reset };
}
