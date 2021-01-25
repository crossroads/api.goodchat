import { Test, SuperTest }  from 'supertest'
import Koa                  from 'koa'
import _                    from 'lodash'
import { GoodchatApp }      from '../../lib/types'

const koaAgent = require('supertest-koa-agent');

export type TestAgent = SuperTest<Test>;

export function createAgent(app: GoodchatApp) : SuperTest<Test> {
  return koaAgent(app);
}

export function createBlankServer(middlewares : any[] = []) : [Koa, SuperTest<Test>] {
  const app = new Koa();

  _.each(_.compact(middlewares), mw => app.use(mw));

  return [app, koaAgent(app)]
}
