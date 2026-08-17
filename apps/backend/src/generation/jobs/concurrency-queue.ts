/**
 * A minimal concurrency-limited queue (04 §4: "p-queue per artifact class").
 *
 * Hand-rolled rather than pulling p-queue, which is ESM-only in current versions
 * and would fight the CommonJS NestJS/Jest setup (the same trap jose set). The
 * behaviour we need — cap N in-flight, queue the rest — is a few lines, and the
 * durable record is the `generation_jobs` table, not this queue (04 §4).
 */
export class ConcurrencyQueue {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly concurrency: number) {}

  /**
   * Runs `task` once a slot is free; resolves/rejects with its result.
   *
   * The slot is TAKEN BEFORE any await, and a released waiter inherits the slot
   * its releaser vacated rather than taking one of its own. The previous shape
   * — check the cap, await, then increment — left a window between the
   * `finally` decrement and the waiter's continuation (a microtask) in which
   * another `run()` could see a free slot and claim it. Both then incremented,
   * and the cap was exceeded by one for as long as they overlapped. The cap is
   * a vendor-spend control, so quietly running over it is not cosmetic.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
      // Released holding the releaser's slot — `active` was never decremented
      // on its behalf, so claiming another here would double-count it.
    } else {
      this.active += 1;
    }

    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) {
        // Hand the slot straight over. FIFO keeps a queued job from starving.
        next();
      } else {
        this.active -= 1;
      }
    }
  }

  get pending(): number {
    return this.waiting.length;
  }

  /** In-flight tasks. Exposed so the cap itself is assertable in tests. */
  get inFlight(): number {
    return this.active;
  }
}
