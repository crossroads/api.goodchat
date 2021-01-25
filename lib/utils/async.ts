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
