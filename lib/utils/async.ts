/**
 * Iterates over each element of the collection and calls the specified function against them
 *
 * @export
 * @template T
 * @param {T} collection
 * @param {Function} fn
 * @returns {Promise<T>}
 */
export async function each<T extends Object|Array<any>>(collection : T, fn: Function) : Promise<T> {
  const entries = Object.entries(collection);

  for (let [k,v] of entries) {
    await fn(v,k)
  }
  return collection
}
