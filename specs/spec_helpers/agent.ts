import { Test, SuperTest }                          from 'supertest'
import Koa                                          from 'koa'
import _                                            from 'lodash'
import bodyParser                                   from 'koa-bodyparser'
import goodchat                                     from '../../index'
import { createTestClient, ApolloServerTestClient } from 'apollo-server-testing'
import { BLANK_CONFIG }                             from '../samples/config'
import { ApolloServer }                             from 'apollo-server-koa'
import {
  GoodchatApp,
  GoodChatConfig
} from '../../lib/typings/goodchat'

const koaAgent = require('supertest-koa-agent');

const DEFAULT_CONFIG = {
  ...BLANK_CONFIG
}

export type TestAgent = SuperTest<Test>;

export function createAgent(app: GoodchatApp) : TestAgent{
  return koaAgent(app);
}

export async function createGoodchatServer(config: Partial<GoodChatConfig> = {}) : Promise<[
  [GoodchatApp, ApolloServer],
  TestAgent,
  ApolloServerTestClient
]> {
  const [app, apollo] = await goodchat({
    ...DEFAULT_CONFIG,
    ...config
  });

  // @ts-ignore B/c context is marked as private.
  const oldContext = apollo.context;
  
  // @ts-ignore B/c context is marked as private.
  apollo.context = (params : any) => {
    return oldContext({
      ctx: {
        request: {
          headers: {
            'Authorization': 'Bearer dummy'
          }
        }
      }
    });
  }
  
  return [[app, apollo], koaAgent(app), createTestClient(apollo)];
}

export function createBlankServer(middlewares : any[] = []) : [Koa, TestAgent] {
  const app = new Koa();

  app.use(bodyParser());

  _.each(_.compact(middlewares), mw => app.use(mw));

  return [app, koaAgent(app)]
}
