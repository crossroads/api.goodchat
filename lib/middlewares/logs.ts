import Koa            from 'koa'
import logger         from '../utils/logger'
import _              from 'lodash'
import { timer }      from '../../lib/utils/async';

const { info, error } = logger('http');

/**
 * Creates a middleware that logs incoming requests 
 */
export default () => {
  return async (ctx : Koa.Context, next: Koa.Next) => {
    const time  = await timer(next);
    const log   = _.inRange(ctx.status, 200, 400) ? info : error

    log(`[${ctx.request.method}] [${ctx.status}] ${ctx.request.path} (${time} ms)`);
  }
}
