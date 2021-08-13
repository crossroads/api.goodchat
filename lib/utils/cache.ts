import { createConnection } from "../redis";
import { AnyFunc, Arguments, Awaited } from "../typings/lang";

type ComputedOptions = {
  expiry?: number
}

// ---------------------------------------------
// ~ HELPERS
// ---------------------------------------------

const getCache = (() => {
  let cache = createConnection({ keyPrefix: 'goodchat:computed:'});
  return () => cache;
})();

const appendArgs(cacheKey: string, args: any[]) : string {
  return `${cacheKey}?${JSON.stringify(args)}`
}

// ---------------------------------------------
// ~ API
// ---------------------------------------------

export function computed<
  F extends AnyFunc,
  R extends Awaited<ReturnType<F>>
>(cacheKey: string, opts: ComputedOptions, func: F) {
  return async (...args: Arguments<F>) : Promise<R> => {
    const cache = getCache();
    const key = appendArgs(cacheKey, args);

    const cachedValue = await cache.get(key);

    if (cachedValue) {
      return JSON.parse(cachedValue);
    }

    const res = await func(...args);

    await cache.set(key, JSON.stringify(res));

    return;
  }
}
