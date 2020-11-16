import Koa    from 'koa'

/**
 * Ensures a well formated error is returned when either of the following happens
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
      ctx.status  = err.status  || 500
      ctx.body = {
        status: ctx.status,
        error:  err.message || 'Internal Server Error'
      }
    }
  }
}
