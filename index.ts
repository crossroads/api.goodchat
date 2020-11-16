import Koa                from 'koa'
import bodyParser         from 'koa-body'
import json               from 'koa-json'
import requireDir         from 'require-dir'
import { each }           from './lib/utils/async'
import hooks              from './lib/middlewares/hooks'
import rest               from './lib/middlewares/rest'
import authentication     from './lib/middlewares/authentication'
import errors             from './lib/middlewares/errors'
import { GoodChatConfig } from './lib/types'


export default (config: GoodChatConfig) : Koa => {
  const app = new Koa();

  // ----------------------
  // Initializers
  // ----------------------

  each(requireDir('./lib/initializers'), (mod: { default: Function }) => {
    const { default: initializer } = mod
    return initializer(config)
  });

  // ----------------------
  // Bootstrap
  // ----------------------

  app.use(json());
  app.use(bodyParser());
  app.use(errors());
  app.use(authentication(config));
  app.use(hooks(config));
  app.use(rest(config));

  return app;
}

