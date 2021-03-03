import { Test, SuperTest }  from 'supertest'
import Koa                  from 'koa'
import _                    from 'lodash'
import bodyParser           from 'koa-bodyparser'
import goodchat             from '../..'
import {
  GoodchatApp,
  GoodChatConfig,
  GoodChatAuthMode
} from 'lib/typings/goodchat'

const koaAgent = require('supertest-koa-agent');

const DEFAULT_CONFIG = {
  smoochAppId:            'sample_app_id',
  smoochApiKeyId:         'sample_api_key_id',
  smoochApiKeySecret:     'sample_api_key_secret',
  goodchatHost:           'localhost:8000',
  authMode:               GoodChatAuthMode.NONE
}

export type TestAgent = SuperTest<Test>;

export function createAgent(app: GoodchatApp) : TestAgent{
  return koaAgent(app);
}

export async function createGoodchatServer(config: Partial<GoodChatConfig> = {}) : Promise<[GoodchatApp, TestAgent]> {
  const [app] = await goodchat({
    ...DEFAULT_CONFIG,
    ...config
  });

  return [app, koaAgent(app)];
}

export function createBlankServer(middlewares : any[] = []) : [Koa, TestAgent] {
  const app = new Koa();

  app.use(bodyParser());

  _.each(_.compact(middlewares), mw => app.use(mw));

  return [app, koaAgent(app)]
}
