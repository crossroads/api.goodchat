import { expect, assert }                 from 'chai'
import _                                  from 'lodash'
import sinon                              from 'sinon'
import * as factories                     from '../../factories'
import db                                 from '../../../lib/db'
import { Conversation, Customer }         from '@prisma/client'
import webhookJob                         from '../../../lib/jobs/webhook.job'
import { waitForEvent }                   from '../../../lib/utils/async'
import { storeWebhookIntegrationSecret }  from '../../../lib/routes/webhooks/setup'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'

const webhookEvent    = factories.sunshineNewConversationEventFactory.build();
const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] })

const webhookIntegrationSecret = 'abcd1234'

describe('Event conversation:create', () => {
  let agent : TestAgent
  let workerSpy : sinon.SinonSpy
  let queueSpy : sinon.SinonSpy

  before(async () => { [, agent] = await createGoodchatServer(); })

  beforeEach(async () => {
    workerSpy = sinon.spy(webhookJob.worker, 'processJob')
    queueSpy = sinon.spy(webhookJob.queue, 'add')
    
    // setup webhook integration
    await storeWebhookIntegrationSecret(webhookIntegrationSecret)
  })

  afterEach(() => {
    workerSpy.restore()
    queueSpy.restore()
  })

  const trigger = async () => {
    await agent.post('/webhooks/trigger')
      .set('x-api-key', webhookIntegrationSecret)
      .send(webhookPayload)
      .expect(200)
  
    // Wait for the worker to pickup the job and process it
    await waitForEvent('completed', webhookJob.worker, { timeout: 500 });
  }

  context("if it doesn't exist locally", () => {

    beforeEach(async () => {
      expect(await db.conversation.count()).to.eq(0)
      expect(await db.customer.count()).to.eq(0)
    });

    it('queues up a job', async () =>{
      expect(queueSpy.callCount).to.eq(0)

      await trigger();

      expect(queueSpy.callCount).to.eq(1)
    })

    it('creates a Conversation record', async () => {
      await trigger();

      expect(workerSpy.callCount).to.eq(1)

      expect(await db.conversation.count()).to.eq(1)

      const conversation = await db.conversation.findFirst({}) as any

      assert.isNotNull(conversation)
      expect(conversation.metadata).to.deep.eq({})
      expect(conversation.type).to.eq("CUSTOMER")
      expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
      expect(conversation.source).to.eq(webhookEvent.payload.source.client.type)
      expect(await db.customer.findFirst({ where: { id: conversation.customerId } })).to.not.be.null
    })

    it('creates a Customer record', async () => {
      await trigger();

      expect(await db.customer.count()).to.eq(1)

      const customer    = await db.customer.findFirst({}) as any
      const { givenName, surname, email } = webhookEvent.payload.user.profile;

      assert.isNotNull(customer)
      expect(customer.displayName).to.eq(`${givenName} ${surname}`);
      expect(customer.email).to.eq(email)
      expect(customer.externalId).to.be.null
      expect(customer.locale).to.eq('en')
      expect(customer.metadata).to.deep.eq({})
      expect(customer.sunshineUserId).to.eq(webhookEvent.payload.user.id)
    })
  })

  context("if it already exists locally", () => {
    let customer : Customer;
    let conversation : Conversation;

    beforeEach(async () => {
      customer     = await factories.customerFactory.create({ sunshineUserId: webhookEvent.payload.user.id });
      conversation = await factories.conversationFactory.create({
        sunshineConversationId: webhookEvent.payload.conversation.id,
        customerId: customer.id
      });

      expect(await db.conversation.count()).to.eq(1)
      expect(await db.customer.count()).to.eq(1)
    });

    it('returns 200', async () => {
      await agent.post('/webhooks/trigger')
        .set('x-api-key', webhookIntegrationSecret)
        .send(webhookPayload)
        .expect(200)
  
      // Wait for the worker to pickup the job and process it
      await waitForEvent('completed', webhookJob.worker, { timeout: 500 });
    });

    it('doesnt create a new conversation', async () => {
      await trigger()
      expect(await db.conversation.count()).to.eq(1)
    })

    it('doesnt create a new customer', async () => {
      await trigger()
      expect(await db.customer.count()).to.eq(1)
    })

    it('updates the existing customer with the sunshine payload user info', async () => {
      const recordBefore = await db.customer.findFirst();

      expect(recordBefore.avatarUrl).to.eq(customer.avatarUrl)
      expect(recordBefore.displayName).to.eq(customer.displayName)
      expect(recordBefore.email).to.eq(customer.email)

      await trigger()

      expect(await db.customer.count()).to.eq(1)

      const recordAfter = await db.customer.findFirst();

      const { givenName, surname } = webhookEvent.payload.user.profile

      expect(recordAfter.id).to.eq(recordBefore.id)
      expect(recordAfter.sunshineUserId).to.eq(recordBefore.sunshineUserId)
      expect(recordAfter.avatarUrl).to.eq(webhookEvent.payload.user.profile.avatarUrl)
      expect(recordAfter.displayName).to.eq(`${givenName} ${surname}`)
      expect(recordAfter.email).to.eq(webhookEvent.payload.user.profile.email)
    })

    context('if the existing converastion has some metadata', () => {
      beforeEach(async () => {
        await db.conversation.update({
          where: { id: conversation.id },
          data: { metadata: { some: 'info' } }
        })
      })

      it('doesnt reset the metadata', async () => {
        await trigger()

        const conv = await db.conversation.findFirst();

        expect(conv.id).to.eq(conversation.id)
        expect(conv.metadata).to.deep.eq({ some: 'info' })
      })
    });
  })
})
