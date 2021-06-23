import { expect }         from 'chai'
import _                          from 'lodash'
import * as factories             from '../../factories'
import db                         from '../../../lib/db'
import { Conversation, Customer } from '@prisma/client'
import webhookJob                 from '../../../lib/jobs/webhook.job'
import { waitForEvent }           from '../../../lib/utils/async'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'
import { GoodChatPermissions } from '../../../lib/typings/goodchat'
import { SinonStub } from 'sinon'
import sinon from 'sinon'
import { IntegrationsApi } from 'sunshine-conversations-client'
import nock from 'nock'
import { FAKE_AUTH_HOST, FAKE_AUTH_ENDPOINT } from '../../samples/config'
import { WebhookPayload } from '../../../lib/typings/webhook_types'

const MOCK_INTEGRATIONS = [{
  id: 1,
  type: 'WhatsApp',
  status: 'active',
}];
const webhookIntegrationSecret = 'abcd1234'

describe('Event conversation:message', () => {
  let agent : TestAgent

  before(async () => { [, agent] = await createGoodchatServer(); })

  beforeEach(async () => {
    // set up webhooks
    const listIntegrations: SinonStub                  = sinon.stub(IntegrationsApi.prototype, 'listIntegrations')
    const createIntegrationWithHttpInfo: SinonStub     = sinon.stub(IntegrationsApi.prototype, 'createIntegrationWithHttpInfo')
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

    nock(FAKE_AUTH_HOST)
      .post(FAKE_AUTH_ENDPOINT)
      .reply(200, {
        userId: '123',
        permissions: [GoodChatPermissions.ADMIN],
        displayName: 'Jane Doe'
      })
    
    await agent.post('/webhooks/connect')
      .set('Authorization', 'Bearer xyz')
      .expect(200);
  })

  afterEach(() => sinon.restore())

  const triggerWithPayload = (webhookPayload: WebhookPayload) => async () => {
    await agent.post('/webhooks/trigger')
    .set('x-api-key', webhookIntegrationSecret)
    .send(webhookPayload)
    .expect(200)
    
    // Wait for the worker to pickup the job and process it
    await waitForEvent('completed', webhookJob.worker, { timeout: 500 });
  }
  
  context('triggered by a user message', () => {
    const conversation    = factories.sunshineConversationFactory.build();
    const webhookEvent    = factories.sunshineNewMessageEventFactory.build({}, { transient: { conversation }});
    const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });
    const trigger = triggerWithPayload(webhookPayload)

    context('if the conversation doesnt exist locally', () => {
      it('returns a 200', async () => {
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .set('x-api-key', webhookIntegrationSecret)
          .expect(200)
      })

      it('creates a conversation', async () => {
        expect(await db.conversation.count()).to.eq(0);

        await trigger()

        expect(await db.conversation.count()).to.eq(1);

        const conversation = await db.conversation.findFirst({
          include: {
            customer: true
          }
        });

        expect(conversation.customer.sunshineUserId).to.eq(webhookEvent.payload.message.author.user.id)
        expect(conversation.type).to.eq("CUSTOMER")
        expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
        expect(conversation.metadata).to.deep.eq({})
      })

      it('creates the customer', async () => {
        expect(await db.customer.count()).to.eq(0);

        await trigger()

        expect(await db.customer.count()).to.eq(1);

        const customer = await db.customer.findFirst({});

        const { givenName, surname } = webhookEvent.payload.message.author.user.profile;

        expect(customer.sunshineUserId).to.eq(webhookEvent.payload.message.author.user.id)
        expect(customer.locale).to.eq(webhookEvent.payload.message.author.user.profile.locale)
        expect(customer.metadata).to.deep.eq({})
        expect(customer.externalId).to.deep.eq(null);
        expect(customer.email).to.deep.eq(webhookEvent.payload.message.author.user.profile.email)
        expect(customer.displayName).to.deep.eq(`${givenName} ${surname}`);
        expect(customer.metadata).to.deep.eq({})
      })
    })

    context('if the conversation and customer exist locally', () => {
      let customer : Customer
      let conversation : Conversation

      beforeEach(async () => {
        customer = await factories.customerFactory.create({ sunshineUserId: webhookEvent.payload.message.author.user.id })
        conversation = await factories.conversationFactory.create({
          sunshineConversationId: webhookEvent.payload.conversation.id,
          customerId: null
        })

        expect(conversation.customerId).to.be.null
      })

      it('returns a 200', async () => {
        await trigger()
      })

      it('creates a Message', async () => {
        expect(await db.message.count()).to.eq(0);

        await trigger()

        expect(await db.message.count()).to.eq(1);
      })

      it('sets the customer id of the conversation if missing', async () => {
        expect((await db.conversation.findFirst()).customerId).to.be.null

        await trigger()

        expect((await db.conversation.findFirst()).customerId).to.eq(customer.id)
      })

      it('assigns the new Message to the customer', async () => {
        await trigger()

        const message = await db.message.findFirst();

        expect(message.authorType).to.eq('CUSTOMER')
        expect(message.authorId).to.eq(customer.id)
      })

      it('adds the new Message to the conversation', async () => {
        await trigger()

        const message = await db.message.findFirst();

        expect(message.conversationId).to.eq(conversation.id);
      })

      it('saves the content of the message', async () => {
        await trigger()

        const message = await db.message.findFirst();

        expect(message.content).to.deep.eq(webhookEvent.payload.message.content)
      })

      it('initializes the message record with empty metadata', async () => {
        await trigger()

        const message = await db.message.findFirst();

        expect(message.metadata).to.deep.eq({})
      })

      context('if the message has already been received', () => {
        beforeEach(async () => {
          await trigger()
        })

        it('doesnt duplicate the message', async () => {
          expect(await db.message.count()).to.eq(1);

          await trigger()

          expect(await db.message.count()).to.eq(1);
        })
      })
    })
  })

  context('triggered by a sunshine integration message', () => {
    const conversation    = factories.sunshineConversationFactory.build();
    const webhookEvent    = factories.sunshineNewMessageEventFactory.build({ payload: { message: { author: { type: 'business' } } } }, { transient: { conversation }});
    const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });
    const trigger = triggerWithPayload(webhookPayload)

    before(() => {
      expect(webhookEvent.payload.message.author.user).to.be.undefined
      expect(webhookEvent.payload.message.author.userId).to.be.undefined
    })

    context('if the conversation exists locally', () => {
      let conversation : Conversation

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({
          sunshineConversationId: webhookEvent.payload.conversation.id
        })
      })

      it('returns a 200', async () => {
        await trigger()
      })

      it('does not create a new one', async () => {
        expect(await db.conversation.count()).to.eq(1)

        await trigger()

        expect(await db.conversation.count()).to.eq(1)
      })

      it('does not nullify the customerId', async () => {
        await trigger()

        expect((await db.conversation.findFirst()).customerId).not.to.be.null
        expect((await db.conversation.findFirst()).customerId).to.eq(conversation.customerId)
      })

      it('does not alter the source', async () => {
        await trigger()

        expect((await db.conversation.findFirst()).source).not.to.be.null
        expect((await db.conversation.findFirst()).source).to.eq(conversation.source)
      })

      it('sets the source only if it is missing', async () => {
        // Clear the source
        await db.conversation.update({
          where: { id: conversation.id },
          data: { source: "" }
        })

        expect((await db.conversation.findFirst()).source).to.be.empty

        await trigger()

        expect((await db.conversation.findFirst()).source).to.eq(webhookEvent.payload.message.source.type)
      })

      it('creates a system message', async () => {
        expect(await db.message.count()).to.eq(0)

        await trigger()

        expect(await db.message.count()).to.eq(1)

        const message = await db.message.findFirst();

        expect(message.authorType).to.eq('SYSTEM');
        expect(message.authorId).to.eq(0);
      })
    })

    context('if the conversation doesnt exist locally', () => {
      it('returns a 200', async () => {
        await trigger()
      })

      it('creates a conversation with no customer', async () => {
        expect(await db.conversation.count()).to.eq(0);

        await trigger()

        expect(await db.conversation.count()).to.eq(1);

        const conversation = await db.conversation.findFirst();

        expect(conversation.customerId).to.be.null
        expect(conversation.type).to.eq("CUSTOMER")
        expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
        expect(conversation.metadata).to.deep.eq({})
      })
    })
  });
})
