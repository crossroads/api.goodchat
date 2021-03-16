import { expect, assert }         from 'chai'
import _                          from 'lodash'
import * as factories             from '../../factories'
import db                         from '../../../lib/db'
import { Conversation, Customer } from '@prisma/client'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'

const webhookEvent    = factories.sunshineNewMessageEventFactory.build();
const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] })

describe('Event conversation:message', () => {
  let agent : TestAgent

  before(async () => { [, agent] = await createGoodchatServer(); })

  context('if the conversation doesnt exist locally', () => {
    it('returns a 404', async () => {
      expect(await db.conversation.count()).to.eq(0);
      
      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(404)
        .expect({
          "error": "Conversation not found",
          "status": 404,
          "type": "NotFound"
        })
    })
  })

  context('if the customer doesnt exist locally', () => {
    beforeEach(async () => {
      await factories.conversationFactory.create({ sunshineConversationId: webhookEvent.payload.conversation.id })
    })

    it('returns a 404', async () => {
      expect(await db.conversation.count()).to.eq(1);
      expect(await db.customer.findUnique({ where: { sunshineUserId: webhookEvent.payload.message.author.userId } })).not.to.exist
      
      await agent.post('/webhooks/trigger')
        .send(webhookPayload)
        .expect(404)
        .expect({
          "error": "Customer not found",
          "status": 404,
          "type": "NotFound"
        })
    })
  })

  context('if the conversation and customer exist locally', () => {
    let customer : Customer
    let conversation : Conversation

    beforeEach(async () => {
      customer = await factories.customerFactory.create({ sunshineUserId: webhookEvent.payload.message.author.user.id })
      conversation = await factories.conversationFactory.create({
        sunshineConversationId: webhookEvent.payload.conversation.id,
        customerId: customer.id
      })
    })

    it('returns a 200', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
    })

    it('creates a Message', async () => {
      expect(await db.message.count()).to.eq(0);
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
      expect(await db.message.count()).to.eq(1);
    })

    it('assigns the new Message to the customer', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

      const message = await db.message.findFirst();

      expect(message.authorType).to.eq('CUSTOMER')
      expect(message.authorId).to.eq(customer.id)
    })

    it('adds the new Message to the conversation', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

      const message = await db.message.findFirst();

      expect(message.conversationId).to.eq(conversation.id);
    })
    
    it('saves the content of the message', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

      const message = await db.message.findFirst();

      expect(message.content).to.deep.eq(webhookEvent.payload.message.content)
    })

    it('initializes the message record with empty metadata', async () => {
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

      const message = await db.message.findFirst();

      expect(message.metadata).to.deep.eq({})
    })

    context('if the message has already been received', () => {
      beforeEach(async () => {
        // Receive the message the first time
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
      })

      it('doesnt duplicate the message', async () => {
        expect(await db.message.count()).to.eq(1);
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
        expect(await db.message.count()).to.eq(1);
      })
    })
  })
})
