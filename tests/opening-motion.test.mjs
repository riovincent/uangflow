import assert from 'node:assert/strict';
import { CONTINUATION_DELAY, logoPose, logoScale, INTRO, smooth } from '../public/glass/opening-motion.mjs';

assert.deepEqual(logoPose(0), logoPose(INTRO.dockStart));
assert.equal(logoPose(INTRO.dockEnd).x, 64);
assert.ok(Math.abs(logoPose(INTRO.dockEnd).y - 32) < 1e-8);
assert.ok(Math.abs(logoPose(INTRO.dockEnd).width - 69.4) < 1e-8);
assert.deepEqual(logoPose(INTRO.dockEnd), logoPose(8.6));
assert.ok(INTRO.shineStart > INTRO.bounceEnd && INTRO.dockStart > INTRO.shineEnd);
assert.ok(Math.abs(INTRO.dockEnd - CONTINUATION_DELAY - 3.2) < 1e-8);
assert.equal(logoScale(INTRO.revealEnd), 1);
assert.equal(logoScale(INTRO.bouncePeak), 1.09);
assert.ok(Math.abs(logoScale(INTRO.bounceRebound) - 0.99) < 1e-8);
assert.equal(logoScale(INTRO.bounceEnd), 1);
assert.equal(logoScale(INTRO.dockStart), 1);
let previous = logoPose(0);
for (let frame = 1; frame < 516; frame++) {
  const pose = logoPose(frame / 60);
  assert.ok(Object.values(pose).every(Number.isFinite));
  assert.ok(pose.x >= 0 && pose.y >= 0 && pose.x + pose.width <= 1920);
  assert.ok(pose.width <= previous.width + 1e-8, 'Docking cannot grow the logo');
  assert.ok(Math.hypot(pose.x - previous.x, pose.y - previous.y) < 24, 'Motion must be continuous');
  assert.ok(Math.abs(logoScale(frame / 60) - logoScale((frame - 1) / 60)) < 0.015, 'Scale cannot jump between frames');
  if (frame / 60 <= INTRO.dockStart) assert.deepEqual(pose, logoPose(0), 'Bounce and shine cannot move the logo');
  previous = pose;
}
assert.equal(smooth(-1), 0);
assert.equal(smooth(2), 1);
const step = 0.001;
for (const edge of [0, 1]) {
  const velocity = (smooth(edge + step) - smooth(edge - step)) / (2 * step);
  const acceleration = (smooth(edge + step) - 2 * smooth(edge) + smooth(edge - step)) / step ** 2;
  assert.ok(Math.abs(velocity) < 0.0001, 'Settling must have zero endpoint velocity');
  assert.ok(Math.abs(acceleration) < 0.02, 'Settling must have zero endpoint acceleration');
}
for (let frame = 1; frame <= Math.ceil(INTRO.revealEnd * 60); frame++) {
  const fill = (time) => smooth((time - INTRO.fillStart) / (INTRO.revealEnd - INTRO.fillStart));
  const change = fill(frame / 60) - fill((frame - 1) / 60);
  assert.ok(change >= -1e-8 && change < 0.05, 'Reveal completion cannot pop between frames');
}
console.log('Motion checks passed: slow reveal, stationary bounce/shine, smooth scale, landing, bounds, and final hold.');
