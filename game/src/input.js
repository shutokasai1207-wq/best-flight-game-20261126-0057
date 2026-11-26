// game/src/input.js — keyboard + mouse input for Sky Courier (~/workspace/makefun/flight-entry/)
// Tracks held keys, edge-triggered presses, and mouse position/clicks on the canvas.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, down: false };

  function codeOf(e) {
    return e.code || e.key || '';
  }

  function onKeyDown(e) {
    const c = codeOf(e);
    if (
      c === 'ArrowUp' ||
      c === 'ArrowDown' ||
      c === 'ArrowLeft' ||
      c === 'ArrowRight' ||
      c === 'Space'
    ) {
      e.preventDefault();
    }
    if (!held.has(c)) pressed.add(c);
    held.add(c);
  }

  function onKeyUp(e) {
    held.delete(codeOf(e));
  }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  }

  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  // Touch: a tap on the canvas counts as a click (drops a parcel).
  function onTouchStart(e) {
    const t = e.touches[0];
    if (!t) return;
    const r = canvas.getBoundingClientRect();
    mouse.x = ((t.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((t.clientY - r.top) / r.height) * canvas.height;
    mouse.down = true;
    mouse.clicked = true;
    e.preventDefault();
  }

  function onTouchEnd() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  return {
    mouse,
    isDown(code) {
      return held.has(code);
    },
    // True only on the frame the key went down.
    wasPressed(code) {
      return pressed.has(code);
    },
    // True if any of the given codes is held.
    anyDown(codes) {
      for (const c of codes) if (held.has(c)) return true;
      return false;
    },
    // True if any of the given codes was pressed this frame.
    anyPressed(codes) {
      for (const c of codes) if (pressed.has(c)) return true;
      return false;
    },
    // Clear edge-triggered state at the end of each frame.
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
