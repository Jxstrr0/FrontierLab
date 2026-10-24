// A least-recently-used cache that budgets by pixel count rather than entry
// count, for the map's chunk canvases (iOS Safari caps total canvas memory).
// Entries used in the current frame are never evicted, so the visible chunks
// always survive even if they alone exceed the budget. Pure, no canvas.

export interface LruEntry<T> {
  value: T;
  px: number;
  frame: number;
}

export class PixelLru<T> {
  private readonly entries = new Map<string, LruEntry<T>>();
  private totalPx = 0;
  private frame = 0;

  constructor(readonly budgetPx: number) {}

  get total(): number {
    return this.totalPx;
  }

  get size(): number {
    return this.entries.size;
  }

  /** Starts a new frame: entries touched from now on are protected from eviction. */
  nextFrame(): void {
    this.frame++;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Reads an entry and marks it used this frame (most recently used). */
  touch(key: string): T | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    this.entries.delete(key);
    e.frame = this.frame;
    this.entries.set(key, e);
    return e.value;
  }

  /** Reads an entry without changing its recency. */
  peek(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }

  /**
   * Inserts or replaces an entry, then evicts least-recently-used entries from
   * earlier frames until the total fits the budget. Returns the evicted values
   * so the caller can free them (the replaced value is not returned).
   */
  set(key: string, value: T, px: number): T[] {
    const old = this.entries.get(key);
    if (old) {
      this.totalPx -= old.px;
      this.entries.delete(key);
    }
    this.entries.set(key, { value, px, frame: this.frame });
    this.totalPx += px;
    return this.evictToFit(0);
  }

  /** Changes an entry's pixel size (e.g. a second canvas is attached). */
  resize(key: string, px: number): T[] {
    const e = this.entries.get(key);
    if (!e) return [];
    this.totalPx += px - e.px;
    e.px = px;
    return this.evictToFit(0);
  }

  /**
   * Evicts old entries until `extraPx` more pixels would fit. Returns what was
   * evicted; stops early if only current-frame entries remain.
   */
  evictToFit(extraPx: number): T[] {
    const out: T[] = [];
    for (const [key, e] of this.entries) {
      if (this.totalPx + extraPx <= this.budgetPx) break;
      if (e.frame >= this.frame) continue;
      this.entries.delete(key);
      this.totalPx -= e.px;
      out.push(e.value);
    }
    return out;
  }

  delete(key: string): T | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    this.entries.delete(key);
    this.totalPx -= e.px;
    return e.value;
  }

  /** Removes everything and returns all values so they can be freed. */
  clear(): T[] {
    const out = [...this.entries.values()].map((e) => e.value);
    this.entries.clear();
    this.totalPx = 0;
    return out;
  }

  keys(): IterableIterator<string> {
    return this.entries.keys();
  }
}
