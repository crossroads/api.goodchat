import Koa            from 'koa'
import { wrapError }  from '../utils/errors'

/**
 * Middleware that ensures a well formated error is returned when either of the following happens
 *  - No route was found
 *  - The route raised an error
 *
 * @export
 */
export default () => {
  return async (ctx : Koa.Context, next: Koa.Next) => {
    try {
      await next()
      if (ctx.status === 404) {
        ctx.throw(404)
      }
    } catch (err) {
      const ex = wrapError(err);

      ctx.status = ex.status;
      ctx.body   = ex.serialize();
    }
  }
}
