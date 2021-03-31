import { expect }                                 from 'chai'
import sinon, {SinonStub }                        from 'sinon'
import Koa                                        from 'koa'
import * as factories                             from '../../factories'
import authenticate                               from '../../../lib/middlewares/authenticate'
import _                                          from 'lodash'
import { BLANK_CONFIG }                           from '../../samples/config'
import { GoodChatAuthMode, GoodChatPermissions }  from '../../../lib/typings/goodchat'
import { GoodchatError }                          from '../../../lib/utils/errors'
import { Staff }                                  from '.prisma/client'
import {
  createBlankServer,
  TestAgent
} from '../../spec_helpers/agent'

const authServiceMod = require('../../../lib/services/auth_service');

const config = {
  ...BLANK_CONFIG,
  auth: {
    mode: GoodChatAuthMode.WEBHOOK,
    url: 'https://fake.url'
  }
}

describe('Middlewares/authenticate', () => {
  let agent           : TestAgent
  let ctx             : Koa.Context
  let authMethodStub  : SinonStub
  let serviceStub     : SinonStub
  let staff           : Staff

  beforeEach(async () => {
    staff = await factories.staffFactory.build({
      permissions: [GoodChatPermissions.CHAT_CUSTOMER]
    });
    authMethodStub = sinon.stub();
    serviceStub = sinon.stub(authServiceMod, 'default').returns({
      authenticate: authMethodStub
    });

    [, agent] = createBlankServer([
      authenticate(config, [GoodChatPermissions.CHAT_CUSTOMER]),
      (_ctx : Koa.Context) => {
        ctx = _ctx;
        ctx.status = 200;
      }
    ])
  })

  afterEach(() => {
    serviceStub.restore();
  })

  it('returns 401 if no bearer token is present', async () => {
    await agent.get('/').expect(401)
  })

  it('initializes the auth service with the config passed as argument', () => {
    sinon.assert.calledOnce(serviceStub)
    sinon.assert.calledWithExactly(serviceStub, config)
  })

  it('calls the authentication service if a token is present', async () => {
    expect(authMethodStub.callCount).to.eq(0)

    await agent
      .get('/')
      .set('Authorization', 'Bearer sometoken')
    
    expect(authMethodStub.callCount).to.eq(1)
  })

  it('returns a 401 if the authentication service rejects the token', async () => {
    authMethodStub = authMethodStub.throws(
      new GoodchatError('no good', 401)
    )

    await agent
      .get('/')
      .set('Authorization', 'Bearer sometoken')
      .expect(401)
    
    expect(authMethodStub.callCount).to.eq(1)
  })

  it('returns a 403 if the user does not have the permissions required', async () => {
    authMethodStub = authMethodStub.returns(Promise.resolve({
      ...staff,
      permissions: [GoodChatPermissions.CHAT_INTERNAL]
    }));

    await agent
      .get('/')
      .set('Authorization', 'Bearer sometoken')
      .expect(403)
    
    expect(authMethodStub.callCount).to.eq(1)
  })

  it('injects the staff member in the context if the authentication service allows the user', async () => {
    authMethodStub = authMethodStub.returns(Promise.resolve(staff));

    await agent
      .get('/')
      .set('Authorization', 'Bearer sometoken')
      .expect(200)
    
    expect(authMethodStub.callCount).to.eq(1)
    expect(ctx.state.staff).to.eq(staff)
  })
});
