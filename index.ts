import Koa                    from 'koa'
import bodyParser             from 'koa-bodyparser'
import hooks                  from './lib/routes/webhooks'
import graphql                from './lib/routes/graphql'
import log                    from './lib/middlewares/logs'
import rescue                 from './lib/middlewares/rescue'
import i18n                   from './lib/middlewares/i18n'
import * as initializers      from './lib/initializers'
import { handleWebhookEvent } from './lib/services/events'
import { ApolloServer }       from 'apollo-server-koa'
import config                 from './lib/config'
import {
  GoodchatApp,
  KoaChatContext
} from './lib/typings/goodchat'

/**
 * Creates a goodchat Koa application
 *
 * ```typescript
 *  const [app] = goodchat()
 *
 *  app.listen(8000, () => ...)
 * ```
 *
 * @exports
 * @returns {Promise<GoodchatApp>}
 */
export const goodchat = async () : Promise<[GoodchatApp, ApolloServer]> => {
  const app : GoodchatApp = new Koa();

  // ----------------------
  // Initializers
  // ----------------------

  await initializers.boot(config);

  // ----------------------
  // Bootstrap
  // ----------------------

  app.use((ctx: KoaChatContext, next: Koa.Next) => {
    ctx.config = config;
    return next();
  });

  app.use(log());
  app.use(rescue());
  app.use(i18n());
  app.use(bodyParser());
  app.use(hooks({
    config:   config,
    callback: (ev) => handleWebhookEvent(ev, config)
  }));

  const gqlServer = await graphql(config);

  app.use(gqlServer.getMiddleware());

  return [app, gqlServer];
}

export default goodchat
