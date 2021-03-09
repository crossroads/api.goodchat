import Koa                    from 'koa'
import bodyParser             from 'koa-bodyparser'
import hooks                  from './lib/middlewares/webhooks'
import rest                   from './lib/middlewares/rest'
import log                    from './lib/middlewares/logs'
import authentication         from './lib/middlewares/authentication'
import rescue                 from './lib/middlewares/rescue'
import i18n                   from './lib/middlewares/i18n'
import * as initializers      from './lib/initializers'
import { handleWebhookEvent } from './lib/services/events'
import {
  GoodChatConfig,
  GoodchatApp,
  KoaChatContext
} from './lib/typings/goodchat'

/**
 * Creates a goodchat Koa application
 *
 * ```typescript
 *  const app = goodchat({
 *   smoochAppId:            'sample_app_id',
 *   smoochApiKeyId:         'sample_api_key_id',
 *   smoochApiKeySecret:     'sample_api_key_secret',
 *   goodchatHost:           'localhost:8000',
 *   authMode:                GoodChatAuthMode.NONE
 *  })
 * 
 *  app.listen(8000, () => ...)
 * ```
 * 
 * @exports
 * @param {GoodChatConfig} config
 * @returns {Promise<GoodchatApp>}
 */
export const goodchat = async (config: GoodChatConfig) : Promise<[GoodchatApp]> => {
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
  app.use(await hooks({
    config:   config,
    callback: handleWebhookEvent
  }));
  app.use(await authentication(config));
  app.use(await rest(config));

  return [app];
}

export default goodchat
