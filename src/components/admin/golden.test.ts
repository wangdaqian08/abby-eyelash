import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goldenGuide } from './golden.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('golden guide: the spiral ends inside the frame, and each turn mirrors it into another corner', () => {
  const [x, y] = goldenGuide(false, 0).end;
  assert.ok(x > 0.5 && x < 1 && y > 0.5 && y < 1, `turn 0 ends lower right, got ${x}, ${y}`);
  const ends = [0, 1, 2, 3].map((t) => goldenGuide(false, t).end);
  assert.ok(close(ends[1][0], 1 - x) && close(ends[1][1], y), 'turn 1 mirrors left-right');
  assert.ok(close(ends[2][0], 1 - x) && close(ends[2][1], 1 - y), 'turn 2 mirrors both ways');
  assert.ok(close(ends[3][0], x) && close(ends[3][1], 1 - y), 'turn 3 mirrors top-bottom');
  assert.deepEqual(goldenGuide(false, 4).end, ends[0], 'a fifth tap is back at the start');
});

test('golden guide: a portrait frame runs the spiral down the long side', () => {
  const [x, y] = goldenGuide(false, 0).end;
  assert.deepEqual(goldenGuide(true, 0).end, [y, x]);
  assert.match(goldenGuide(true, 0).svg, /viewBox="0 0 1 1\.618/);
  assert.match(goldenGuide(false, 0).svg, /viewBox="0 0 1\.618\d* 1"/);
});
