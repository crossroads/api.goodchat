import Koa                from 'koa'
import bodyParser         from 'koa-bodyparser'
import hooks              from './lib/middlewares/hooks'
import rest               from './lib/middlewares/rest'
import authentication     from './lib/middlewares/authentication'
import rescue             from './lib/middlewares/rescue'
import i18n               from './lib/middlewares/i18n'
import * as initializers  from './lib/initializers'
import {
  GoodchatApp,
  GoodChatConfig,
  KoaChatContext
} from './lib/types'

export const goochat = async (config: GoodChatConfig) : Promise<GoodchatApp> => {
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
    next();
  });

  app.use(rescue());
  app.use(i18n());
  app.use(bodyParser());
  app.use(await authentication(config));
  app.use(await hooks(config));
  app.use(await rest(config));

  return app;
}

export default goochat;
