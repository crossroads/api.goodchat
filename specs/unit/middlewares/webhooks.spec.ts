import { expect }                         from 'chai'
import webhooks                           from '../../../lib/middlewares/webhooks'
import rescue                             from '../../../lib/middlewares/rescue'
import _                                  from 'lodash'
import sinon, { SinonStub }               from 'sinon'
import { createBlankServer, TestAgent }   from '../../spec_helpers/agent'
import { BLANK_CONFIG }                   from '../../samples/config'
import { IntegrationsApi }                from 'sunshine-conversations-client'

type AnyFunc = (...args: any[]) => any

describe('Middlewares/webhooks', () => {
  const CUSTOM_INTEGRATION_NAME = '[test] GoodChat Webhooks'

  // ---- Helpers

  const newServer = async (cb : AnyFunc = _.noop) => {
    return createBlankServer([ rescue(), await webhooks({ config: BLANK_CONFIG, callback: cb }) ])
  };
  
  // ---- Vars

  let listIntegrations  : SinonStub
  let createIntegration : SinonStub
  let deleteIntegration : SinonStub

  let MOCK_INTEGRATIONS = [{
    id: 1,
    type: 'WhatsApp',
    status: 'active',
  }];

  // ---- Hooks

  beforeEach(() => {
    listIntegrations      = sinon.stub(IntegrationsApi.prototype, 'listIntegrations')
    createIntegration     = sinon.stub(IntegrationsApi.prototype, 'createIntegration')
    deleteIntegration     = sinon.stub(IntegrationsApi.prototype, 'deleteIntegration')
  })

  afterEach(() => sinon.restore())

  // ---- Specs

  describe('Routes', () => {
    describe('POST /connect', () => {
      context('if the integration does not already exist', () => {
        let agent : TestAgent
        let createArgs : any[] = []

        beforeEach(async () => {
          agent = (await newServer())[1];
          listIntegrations.returns({ integrations: MOCK_INTEGRATIONS })
          createIntegration.returns({})
          deleteIntegration.returns({})

          createIntegration.callsFake((...all) => createArgs = all);

          await agent.post('/webhooks/connect').expect(200);

          expect(createArgs.length).to.eq(2)
        })

        it('doesnt delete any existing integrations', async () => {
          expect(deleteIntegration.callCount).to.eq(0)
        })

        it('creates a custom integration', async () => {
          const [$, payload] = createArgs;
          expect(payload["type"]).to.eq('custom');
        })

        it('creates an integration name based on the environment', () => {
          const [$, payload] = createArgs;
          expect(payload["displayName"]).to.eq(CUSTOM_INTEGRATION_NAME);
        })

        it('creates a webhook pointing to /trigger', () => {
          const [$, payload] = createArgs;
          expect(payload["webhooks"].length).to.eq(1);
          expect(payload["webhooks"][0]["target"]).to.eq("https://localhost:8000/webhooks/trigger");
        })

        it('creates a webhook trigger with includeFullUser set to true', () => {
          const [$, payload] = createArgs;
          expect(payload["webhooks"].length).to.eq(1);
          expect(payload["webhooks"][0]["includeFullUser"]).to.eq(true);
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
          "conversation:typing",
          "user:merge"
        ], trigger => {
          it(`connects the webhook to the ${trigger} trigger`, () => {
            const [$, payload] = createArgs;
            expect(payload["webhooks"][0]["triggers"]).to.include(trigger);
          })
        });
      });

      context('if a custom integration already exists', () => {
        let MOCK_INTEGRATIONS = (id : string) => [{
          "id": id,
          "status": "active",
          "type": "custom",
          "displayName": CUSTOM_INTEGRATION_NAME
        }];

        beforeEach(() => {  
          listIntegrations.returns({ integrations: MOCK_INTEGRATIONS("1") })
          createIntegration.returns({ integrations: MOCK_INTEGRATIONS("2") })
          deleteIntegration
            .withArgs('sample_app_id', "1")
            .returns({})
        })

        it('deletes the existing one', async () => {
          const [app, agent] = await newServer();

          await agent
            .post('/webhooks/connect')
            .expect(200);

          expect(deleteIntegration.callCount).to.equal(1)
          expect(listIntegrations.callCount).to.equal(1)
          expect(createIntegration.callCount).to.equal(1)
        });
      });
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
