import { Test, SuperTest }  from 'supertest';
import Koa                  from 'koa';

const koaAgent = require('supertest-koa-agent');

export type TestAgent = SuperTest<Test>;

export function createAgent(app: Koa) : SuperTest<Test> {
  return koaAgent(app);
}
