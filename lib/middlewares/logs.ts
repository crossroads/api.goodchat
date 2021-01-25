import Koa            from 'koa'
import logger from '../utils/logger';

const { info } = logger('incoming');

export default () => {
  return async (ctx : Koa.Context, next: Koa.Next) => {
    info(`${ctx.request.method} ${ctx.request.path}`);
    return next();
  }
}
