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
export async function each<T>(collection : Collection<T>, fn: (arg: T, key: string) => unknown) : Promise<Collection<T>> {
  const entries = Object.entries(collection);

  for (const [k,v] of entries) {
    await fn(v,k)
  }
  return collection
}

/**
 * Runs a function and returns the time it took in ms to execute it
 *
 * @export
 * @param {Function} fn
 * @returns
 */
export async function timer(fn : (...args: any[]) => unknown) {
  const start = Date.now();
  await fn();
  return Math.ceil(Date.now() - start);
}


/**
 * Returns true if the specified object is a promise
 *
 * @export
 * @param {*} obj
 * @returns {obj is Promise<any>}
 */
export function isPromise(obj: any) : obj is Promise<any> {
  return (typeof obj?.then === 'function');
}
