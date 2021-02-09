import EventEmitter from "events"

type Collection<T> = Array<T> | { [key:string]: T } | { [key:number]: T }

/**
 * Iterates over each element of the collection and calls the specified function against them
 *
 * @export
 * @template T
 * @param {T} collection
 * @param {Function} fn
 * @returns {Promise<T>}
 */
export async function each<T>(collection : Collection<T>, fn: Function) : Promise<Collection<T>> {
  const entries = Object.entries(collection);

  for (let [k,v] of entries) {
    await fn(v,k)
  }
  return collection
}


/**
 * A map function which supports asynchronous Iteratee methods
 *
 * @export
 * @template T
 * @template TResult
 * @param {Collection<T>} collection
 * @param {(it: T) => TResult} fn
 * @returns {Promise<TResult[]>}
 */
export async function map<T, TResult>(collection : Collection<T>, fn: (it: T) => TResult) : Promise<TResult[]> {
  const entries = Object.entries(collection);

  let results = [];
  for (let [k,v] of entries) {
    results.push(await fn(v));
  }
  return results
}

/**
 * Given an event emitter, will return a promise that waits for the specified event to be triggered.
 *
 * If a timeout is set, it will fail if the event does not occur within that range
 * 
 * @export
 * @param {string} event
 * @param {EventEmitter} source
 * @returns {Promise<void>}
 */
export function waitForEvent(event: string, source : EventEmitter, opts?: { timeout: number }) : Promise<void> {
  return new Promise((done, fail) => {
    let resolved = false;

    if (opts?.timeout) {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          fail(new Error(`Timeout (${opts.timeout}) before '${event}' event`))
        }
      }, opts.timeout)
    }

    source.once(event, () => {
      if (!resolved) {
        resolved = true;
        done();
      }
    });
  });
}

/**
 * Runs a function and returns the time it took in ms to execute it
 *
 * @export
 * @param {Function} fn
 * @returns
 */
export async function timer(fn : Function) {
  const start = Date.now();
  await fn();
  return Math.ceil(Date.now() - start);
}
