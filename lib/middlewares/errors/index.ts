import Koa    from 'koa'
import { capitalize } from 'lodash'

/**
 * 
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
      ctx.status  = err.status  || 500
      ctx.body = {
        status: ctx.status,
        error:  err.message || 'Internal Server Error'
      }
    }
  }
}
