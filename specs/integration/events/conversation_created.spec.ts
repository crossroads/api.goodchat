import { expect, assert }         from 'chai'
import _                          from 'lodash'
import * as factories             from '../../factories'
import db                         from '../../../lib/db'
import { Conversation, Customer } from '@prisma/client'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'

const webhookEvent    = factories.sunshineNewConversationEventFactory.build();
const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] })

describe('Event: New Sunshine Converastion', () => {
  let agent : TestAgent

  before(async () => { [, agent] = await createGoodchatServer(); })

  context("If it doesn't exist locally", () => {

    beforeEach(async () => {
      expect(await db.conversation.count()).to.eq(0)
      expect(await db.customer.count()).to.eq(0)
    });

    it('creates a Conversation record', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

      expect(await db.conversation.count()).to.eq(1)

      const conversation = await db.conversation.findFirst({}) as any

      assert.isNotNull(conversation)
      expect(conversation.metadata).to.deep.eq({})
      expect(conversation.private).to.eq(false)
      expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
      expect(conversation.source).to.eq(webhookEvent.payload.source.client.type)
      expect(await db.customer.findFirst({ where: { id: conversation.customerId } })).to.not.be.null
    })
    
    it('creates a Customer record', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

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
 
  context("If already exists locally", () => {
    let customer : Customer;
    let conversation : Conversation;

    beforeEach(async () => {
      customer     = await factories.customerFactory.create({ sunshineUserId: webhookEvent.payload.user.id });
      conversation = await factories.conversationFactory.create({ customerId: customer.id });

      expect(await db.conversation.count()).to.eq(1)
      expect(await db.customer.count()).to.eq(1)
    });

    it('returns 200', async () => {
      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(200)
    });

    it('doesnt create a new conversation', async () => {

      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(200)

      expect(await db.conversation.count()).to.eq(1)
    })

    it('doesnt create a new customer', async () => {

      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(200)

      expect(await db.customer.count()).to.eq(1)
    })

    it('updates the existing customer with the sunshine payload user info', async () => {
      const recordBefore = await db.customer.findFirst();

      expect(recordBefore.avatarUrl).to.eq(customer.avatarUrl)
      expect(recordBefore.displayName).to.eq(customer.displayName)
      expect(recordBefore.email).to.eq(customer.email)

      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(200)

      expect(await db.customer.count()).to.eq(1)

      const recordAfter = await db.customer.findFirst();

      const { givenName, surname } = webhookEvent.payload.user.profile

      expect(recordAfter.id).to.eq(recordBefore.id)
      expect(recordAfter.sunshineUserId).to.eq(recordBefore.sunshineUserId)
      expect(recordAfter.avatarUrl).to.eq(webhookEvent.payload.user.profile.avatarUrl)
      expect(recordAfter.displayName).to.eq(`${givenName} ${surname}`)
      expect(recordAfter.email).to.eq(webhookEvent.payload.user.profile.email)
    })
  })
})
