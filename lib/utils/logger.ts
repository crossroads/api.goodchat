import debug  from 'debug'
import _      from 'lodash'

export interface Logger<T = debug.Debugger> {
  info:     T,
  error:    T,
  verbose:  T,
  panic:    (...arg: any[]) => never
}

const LEVELS = (process.env.LOG_LEVELS || "").split(',');

const createDebug = (name: string, level: string) => {
  const logger = debug(name + ':' + level);
  logger.enabled = _.includes(LEVELS, level);
  return logger;
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
  const panic = createDebug(name, 'panic');

  return {
    info: createDebug(name, 'info'),
    error:  createDebug(name, 'error'),
    verbose: createDebug(name, 'verbose'),

    panic: ((arg : any) : never => {
      /* istanbul ignore next */
      panic(arg);
      /* istanbul ignore next */
      return process.exit(1);
    })
  };
}

export default createLogger;
