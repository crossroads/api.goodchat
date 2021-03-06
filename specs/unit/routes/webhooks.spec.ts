import { createBlankServer, TestAgent }   from '../../spec_helpers/agent'
import { reloadConfig, useConfig }        from '../../../lib/config'
import sinon, { SinonStub }               from 'sinon'
import { IntegrationsApi }                from 'sunshine-conversations-client'
import { GoodchatError }                  from '../../../lib/utils/errors'
import { BLANK_CONFIG }                   from '../../samples/config'
import { expect }                         from 'chai'
import webhooks                           from '../../../lib/routes/webhooks'
import rescue                             from '../../../lib/middlewares/rescue'
import _                                  from 'lodash'
import { getWebhookIntegrationSecret } from '../../../lib/routes/webhooks/setup'

type AnyFunc = (...args: any[]) => any

describe('Routes/webhooks', () => {
  const CUSTOM_INTEGRATION_NAME = '[test] GoodChat Webhooks'

  // ---- Helpers

  const newServer = async (cb : AnyFunc = _.noop) => {
    return createBlankServer([ rescue(), await webhooks({ callback: cb }) ])
  };

  // ---- Vars

  let listIntegrations  : SinonStub
  let createIntegrationWithHttpInfo : SinonStub
  let deleteIntegration : SinonStub

  let MOCK_INTEGRATIONS = [{
    id: 1,
    type: 'WhatsApp',
    status: 'active',
  }];

  // ---- Hooks

  before(() => {
    useConfig(BLANK_CONFIG);
  })

  after(() => {
    reloadConfig();
  })

  beforeEach(() => {
    listIntegrations = sinon.stub(IntegrationsApi.prototype, 'listIntegrations')
    createIntegrationWithHttpInfo = sinon.stub(IntegrationsApi.prototype, 'createIntegrationWithHttpInfo')
    deleteIntegration = sinon.stub(IntegrationsApi.prototype, 'deleteIntegration')
  })

  afterEach(() => sinon.restore())

  // ---- Specs

  describe('Routes', () => {
    describe('POST /connect', () => {
      context('if the integration does not already exist', () => {
        let agent : TestAgent
        const webhookIntegrationSecret = 'xyz1234'

        beforeEach(async () => {
          agent = (await newServer())[1];
          listIntegrations.returns({ integrations: MOCK_INTEGRATIONS })
          createIntegrationWithHttpInfo.returns({
            response: {
              body: {
                integration: {
                  webhooks: [{ secret: webhookIntegrationSecret}]
                }
              }
            }
          })
          deleteIntegration.returns({})

          await agent.post('/webhooks/connect').expect(200);
        })

        it('stores webhook secret', async () => {
          expect(await getWebhookIntegrationSecret()).to.equal(webhookIntegrationSecret)
        })

        it('doesnt delete any existing integrations', async () => {
          expect(deleteIntegration.callCount).to.eq(0)
        })

        it('creates a custom integration', async () => {
          expect(createIntegrationWithHttpInfo).to.be.calledWith(
            sinon.match.any,
            sinon.match({ type: 'custom' })
          )
        })

        it('creates an integration name based on the environment', () => {
          expect(createIntegrationWithHttpInfo).to.be.calledWith(
            sinon.match.any,
            sinon.match({ displayName: CUSTOM_INTEGRATION_NAME })
          )
        })

        it('creates a webhook pointing to /trigger', () => {
          expect(createIntegrationWithHttpInfo).to.be.calledWith(
            sinon.match.any,
            sinon.match({
              "webhooks": [
                sinon.match({
                  target: 'https://localhost:8000/webhooks/trigger'
                })
              ]
            })
          )
        })

        it('creates a webhook trigger with includeFullUser set to true', () => {
          expect(createIntegrationWithHttpInfo).to.be.calledWith(
            sinon.match.any,
            sinon.match({
              "webhooks": [
                sinon.match({
                  includeFullUser: true
                })
              ]
            })
          )
        })

        _.each([
          "conversation:create",
          "conversation:join",
          "conversation:read",
          "conversation:message",
          "conversation:leave",
          "conversation:message:delivery:channel",
          "conversation:message:delivery:failure",
          "conversation:message:delivery:user",
          "conversation:postback",
          "conversation:read",
          "conversation:typing"
        ], trigger => {
          it(`connects the webhook to the ${trigger} trigger`, () => {
            expect(createIntegrationWithHttpInfo).to.be.calledWith(
              sinon.match.any,
              sinon.match({
                "webhooks": [
                  sinon.match({
                    triggers: sinon.match.array.contains([trigger])
                  })
                ]
              })
            )
          })
        });
      });

      context('if a custom integration already exists', () => {
        const webhookIntegrationSecret1 = "xyz1234-1"
        const webhookIntegrationSecret2 = "xyz1234-2"

        let MOCK_INTEGRATIONS = (id : string, webhookIntegrationSecret: string) => [{
          "id": id,
          "status": "active",
          "type": "custom",
          "displayName": CUSTOM_INTEGRATION_NAME,
          "webhooks": [{
            id: "abcd1234",
            version: "v2",
            target: "https://localhost:8000/webhooks/trigger",
            triggers: [
              "conversation:create",
              "conversation:join",
              "conversation:leave",
              "conversation:remove",
              "conversation:message",
              "conversation:postback",
              "conversation:read",
              "conversation:typing",
              "conversation:message:delivery:channel",
              "conversation:message:delivery:failure",
              "conversation:message:delivery:user",
            ],
            includeFullSource: true,
            includeFullUser: true,
            secret: webhookIntegrationSecret,
          }]
        }];

        beforeEach(async () => {
          const agent = (await newServer())[1];
          listIntegrations.returns({ integrations: MOCK_INTEGRATIONS("1", webhookIntegrationSecret1) })
          createIntegrationWithHttpInfo
            .onFirstCall().returns({
              response: {
                body: {
                  integration: {
                    webhooks: [{ secret: webhookIntegrationSecret1 }]
                  }
                }
              }
            })
            .onSecondCall().returns({
              response: {
                body: {
                  integration: {
                    webhooks: [{ secret: webhookIntegrationSecret2 }]
                  }
                }
              }
            })
          deleteIntegration
            .withArgs('sample_app_id', "1")
            .returns({})

          await agent.post('/webhooks/connect').expect(200);
        })

        it('deletes the existing one', async () => {
          const [_, agent] = await newServer();

          await agent
            .post('/webhooks/connect')
            .expect(200);

          expect(deleteIntegration.callCount).to.equal(2)
          expect(listIntegrations.callCount).to.equal(2)
          expect(createIntegrationWithHttpInfo.callCount).to.equal(2)
        });

        it('replaces the previous webhookIntegrationSecret', async () => {
          expect(await getWebhookIntegrationSecret()).to.eq(webhookIntegrationSecret1)

          const [_, agent] = await newServer();

          await agent
            .post('/webhooks/connect')
            .expect(200);

            expect(await getWebhookIntegrationSecret()).not.to.eq(webhookIntegrationSecret1)
            expect(await getWebhookIntegrationSecret()).to.eq(webhookIntegrationSecret2)
        })
      });
    })

    describe('POST /trigger', () => {
      context('As an unauthorized webhook caller', () => {
        it('returns 401 error', async () => {
          const cb = sinon.stub()
          const [_, agent] = await newServer(cb);

          await agent
            .post('/webhooks/trigger')
            .set('Accept', 'application/json')
            .send({
              app: {
                id: "app"
              },
              webhook: {
                id:       "123",
                version:  "1"
              },
              events: [{}]
            })
            .expect(401)
        })
      })

      context('As an authorized webhook caller', () => {
        const webhookIntegrationSecret = 'xyz1234'
        let cb: sinon.SinonStub = null
        let agent: TestAgent = null

        beforeEach(async () => {
          listIntegrations.returns({ integrations: MOCK_INTEGRATIONS })
          createIntegrationWithHttpInfo.returns({
            response: {
              body: {
                integration: {
                  webhooks: [{ secret: webhookIntegrationSecret }]
                }
              }
            }
          })

          cb = sinon.stub();
          agent = (await newServer(cb))[1];

          await agent.post('/webhooks/connect').expect(200);
          expect(await getWebhookIntegrationSecret())
            .to.eq(webhookIntegrationSecret)
        })

        it('fires the configured callback', async () => {
          await agent
            .post('/webhooks/trigger')
            .set('Accept', 'application/json')
            .set('x-api-key', webhookIntegrationSecret)
            .send({
              app: {
                id: "app"
              },
              webhook: {
                id:       "123",
                version:  "1"
              },
              events: [{}]
            })
            .expect(200);

          expect(cb.callCount).to.eq(1)
        })

        it('fires the configured callback once per event', async () => {
          const ev1 = { id: 1 };
          const ev2 = { id: 2 };
          const ev3 = { id: 3 };

          await agent
            .post('/webhooks/trigger')
            .set('Accept', 'application/json')
            .set('x-api-key', webhookIntegrationSecret)
            .send({
              app: {
                id: "app"
              },
              webhook: {
                id:       "123",
                version:  "1"
              },
              events: [ev1, ev2, ev3]
            })
            .expect(200);

          expect(cb.callCount).to.eq(3)
          expect(cb.withArgs(ev1).callCount).to.eq(1)
          expect(cb.withArgs(ev2).callCount).to.eq(1)
          expect(cb.withArgs(ev3).callCount).to.eq(1)
        })

        it('propagates callback errors to the response', async () => {
          const cb = sinon.stub().throws(new GoodchatError('bad', 422, {}, 'SpecialError'))
          const [_, agent] = await newServer(cb)

          await agent
            .post('/webhooks/trigger')
            .set('Accept', 'application/json')
            .set('x-api-key', webhookIntegrationSecret)
            .send({
              app: {
                id: "app"
              },
              webhook: {
                id:       "123",
                version:  "1"
              },
              events: [{}]
            })
            .expect({
              error: 'bad',
              status: 422,
              type: "SpecialError"
            })
            .expect(422);
        })
      })
    })

    describe('HEAD /trigger', () => {
      // For Sunshine Usage

      it("returns 200", async () => {
        const [_, agent] = await newServer();

        await agent
          .head('/webhooks/trigger')
          .expect(200);
      })
    })

    describe('GET /integrations', () => {
      beforeEach(() => {
        listIntegrations.returns({ integrations: MOCK_INTEGRATIONS });
      })

      it("calls the IntegrationApi", async () => {
        const [_, agent] = await newServer();

        await agent
          .get('/webhooks/integrations')
          .expect(200);

        expect(listIntegrations.callCount).to.equal(1)
      })

      it("lists sunshine integrations", async () => {
        const [_, agent] = await newServer();

        await agent
          .get('/webhooks/integrations')
          .expect(200)
          .expect(MOCK_INTEGRATIONS)
      })
    })
  });
});
