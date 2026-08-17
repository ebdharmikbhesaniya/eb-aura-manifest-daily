import { ConcurrencyQueue } from './concurrency-queue';

/**
 * The hand-rolled queue standing in for p-queue (04 §4, ESM trap). Small enough
 * to reason about, load-bearing enough that its cap and its slot-release-on-throw
 * both need pinning — a leaked slot would silently throttle generation to zero.
 */
describe('ConcurrencyQueue', () => {
  /** A task whose resolution the test controls. */
  const deferred = () => {
    let resolve!: (v: string) => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  const tick = () => new Promise((r) => setImmediate(r));

  it('runs a task and resolves with its result', async () => {
    const queue = new ConcurrencyQueue(1);

    await expect(queue.run(async () => 'done')).resolves.toBe('done');
  });

  it('runs tasks immediately while slots remain', async () => {
    const queue = new ConcurrencyQueue(2);
    const a = deferred();
    const b = deferred();
    const started: string[] = [];

    void queue.run(async () => {
      started.push('a');
      return a.promise;
    });
    void queue.run(async () => {
      started.push('b');
      return b.promise;
    });
    await tick();

    expect(started).toEqual(['a', 'b']);
  });

  it('holds a task back once the cap is reached', async () => {
    const queue = new ConcurrencyQueue(1);
    const first = deferred();
    const started: string[] = [];

    void queue.run(async () => {
      started.push('first');
      return first.promise;
    });
    void queue.run(async () => {
      started.push('second');
      return 'second';
    });
    await tick();

    expect(started).toEqual(['first']);
    expect(queue.pending).toBe(1);
  });

  it('starts the waiting task when a slot frees', async () => {
    const queue = new ConcurrencyQueue(1);
    const first = deferred();
    const started: string[] = [];

    void queue.run(async () => {
      started.push('first');
      return first.promise;
    });
    void queue.run(async () => {
      started.push('second');
      return 'second';
    });
    await tick();

    first.resolve('first');
    await tick();

    expect(started).toEqual(['first', 'second']);
    expect(queue.pending).toBe(0);
  });

  it('releases waiters in FIFO order so a queued job cannot starve', async () => {
    const queue = new ConcurrencyQueue(1);
    const blocker = deferred();
    const started: string[] = [];

    void queue.run(async () => blocker.promise);
    for (const name of ['a', 'b', 'c']) {
      void queue.run(async () => {
        started.push(name);
        return name;
      });
    }
    await tick();

    blocker.resolve('go');
    await tick();
    await tick();
    await tick();

    expect(started).toEqual(['a', 'b', 'c']);
  });

  it('frees the slot when a task throws — a failure must not leak capacity', async () => {
    const queue = new ConcurrencyQueue(1);

    await expect(
      queue.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    // The slot came back: a following task runs rather than hanging forever.
    await expect(queue.run(async () => 'after')).resolves.toBe('after');
  });

  it('never exceeds its cap under a burst', async () => {
    const queue = new ConcurrencyQueue(3);
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 25 }, () =>
        queue.run(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await tick();
          active -= 1;
          return 'ok';
        }),
      ),
    );

    expect(peak).toBe(3);
    expect(active).toBe(0);
  });
});

describe('ConcurrencyQueue — the cap holds under a handover race', () => {
  it('never exceeds the cap when a run() lands during a handover', async () => {
    const queue = new ConcurrencyQueue(2);
    let inFlight = 0;
    let peak = 0;

    const release: (() => void)[] = [];
    const task = () =>
      new Promise<void>((resolve) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        release.push(() => {
          inFlight -= 1;
          resolve();
        });
      });

    // Fill both slots and queue two more.
    const runs = [queue.run(task), queue.run(task), queue.run(task), queue.run(task)];

    // Finish one. The waiter's continuation is a MICROTASK, so a run() enqueued
    // as a microtask ahead of it is exactly the interleaving that used to slip
    // an extra task past the cap.
    release[0]?.();
    void Promise.resolve().then(() => {
      runs.push(queue.run(task));
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(peak).toBeLessThanOrEqual(2);
    expect(queue.inFlight).toBeLessThanOrEqual(2);

    // Drain across microtask turns: releasing a task lets a waiter start, which
    // registers its own release — a single synchronous pass would miss those.
    for (let turn = 0; turn < 20 && release.length > 0; turn++) {
      while (release.length > 0) release.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    }

    await Promise.all(runs);

    expect(queue.inFlight).toBe(0);
  });
});
