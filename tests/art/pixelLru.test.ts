import { describe, expect, it } from 'vitest';
import { PixelLru } from '../../src/art/pixelLru';

describe('pixel-budgeted LRU', () => {
  it('tracks total pixels through set, replace, resize and delete', () => {
    const lru = new PixelLru<string>(1000);
    lru.set('a', 'A', 100);
    lru.set('b', 'B', 200);
    expect(lru.total).toBe(300);
    lru.set('a', 'A2', 150);
    expect(lru.total).toBe(350);
    expect(lru.peek('a')).toBe('A2');
    lru.resize('b', 50);
    expect(lru.total).toBe(200);
    expect(lru.delete('a')).toBe('A2');
    expect(lru.total).toBe(50);
    expect(lru.clear()).toEqual(['B']);
    expect(lru.total).toBe(0);
    expect(lru.size).toBe(0);
  });

  it('evicts least recently used entries from earlier frames to fit the budget', () => {
    const lru = new PixelLru<string>(300);
    lru.set('a', 'A', 100);
    lru.set('b', 'B', 100);
    lru.set('c', 'C', 100);
    lru.nextFrame();
    lru.touch('a'); // a is now most recent and protected this frame
    const evicted = lru.set('d', 'D', 100);
    expect(evicted).toEqual(['B']);
    expect(lru.has('a')).toBe(true);
    expect(lru.total).toBe(300);
  });

  it('never evicts entries used in the current frame, even over budget', () => {
    const lru = new PixelLru<string>(150);
    lru.set('a', 'A', 100);
    const evicted = lru.set('b', 'B', 100);
    expect(evicted).toEqual([]);
    expect(lru.total).toBe(200);
    lru.nextFrame();
    lru.touch('b');
    expect(lru.evictToFit(0)).toEqual(['A']);
    expect(lru.total).toBe(100);
  });

  it('can make room ahead of an allocation', () => {
    const lru = new PixelLru<number>(500);
    for (let k = 0; k < 5; k++) lru.set(`k${k}`, k, 100);
    lru.nextFrame();
    expect(lru.evictToFit(250)).toEqual([0, 1, 2]);
    expect(lru.total).toBe(200);
  });
});
