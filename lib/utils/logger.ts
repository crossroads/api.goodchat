import debug  from 'debug'

export interface Logger<T = debug.Debugger> {
  info:     T,
  error:    T,
  verbose:  T,
  panic:    (...arg: any[]) => never
}

/**
 * Creates a Logger object with the following methods
 * 
 * - info
 * - error
 * - verbose
 * - panic (terminates)
 *
 * Example:
 * 
 * ```typescript
 * import logger from './logger'
 * 
 * const { info, error } = logger('myApp');
 * 
 * info('cool')
 * error('not cool')
 * ```
 * 
 * @export
 * @param {string} [name='goodchat']
 * @returns {Logger}
 */
export function createLogger (name = 'goodchat') : Logger {
  const panic = debug(`${name}:panic`);

  return {
    info: debug(`${name}:info`),
    error:  debug(`${name}:error`),
    verbose: debug(`${name}:verbose`),

    panic: ((arg : any) : never => {
      panic(arg);
      return process.exit(1);
    })
  };
}

export default createLogger;
