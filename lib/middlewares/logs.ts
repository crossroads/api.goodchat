import Koa            from 'koa'
import logger from '../utils/logger';

const { info } = logger('incoming');

/**
 * Creates a middleware that logs incoming requests 
 */
export default () => {
  return async (ctx : Koa.Context, next: Koa.Next) => {
    info(`${ctx.request.method} ${ctx.request.path}`);
    return next();
  }
}
