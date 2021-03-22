import { expect, assert }         from 'chai'
import _                          from 'lodash'
import * as factories             from '../../factories'
import db                         from '../../../lib/db'
import { Conversation, Customer } from '@prisma/client'
import {
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'


describe('Event conversation:message', () => {
  let agent : TestAgent

  before(async () => { [, agent] = await createGoodchatServer(); })

  context('triggered by a user message', () => {
    const conversation    = factories.sunshineConversationFactory.build();
    const webhookEvent    = factories.sunshineNewMessageEventFactory.build({}, { transient: { conversation }});
    const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });

    context('if the conversation doesnt exist locally', () => {
      it('returns a 200', async () => {      
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .expect(200)
      })

      it('creates a conversation', async () => {
        expect(await db.conversation.count()).to.eq(0);
        
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .expect(200)

        expect(await db.conversation.count()).to.eq(1);

        const conversation = await db.conversation.findFirst({
          include: {
            customer: true
          }
        });

        expect(conversation.customer.sunshineUserId).to.eq(webhookEvent.payload.message.author.user.id)
        expect(conversation.private).to.eq(false)
        expect(conversation.readByCustomer).to.eq(true)
        expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
        expect(conversation.metadata).to.deep.eq({})
      })

      it('creates the customer', async () => {
        expect(await db.customer.count()).to.eq(0);
        
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .expect(200)

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
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
      })

      it('creates a Message', async () => {
        expect(await db.message.count()).to.eq(0);
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
        expect(await db.message.count()).to.eq(1);
      })

      it('sets the customer id of the conversation if missing', async () => {
        expect((await db.conversation.findFirst()).customerId).to.be.null
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
        expect((await db.conversation.findFirst()).customerId).to.eq(customer.id)
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

  context('triggered by a sunshine integration message', () => {
    const conversation    = factories.sunshineConversationFactory.build();
    const webhookEvent    = factories.sunshineNewMessageEventFactory.build({ payload: { message: { author: { type: 'business' } } } }, { transient: { conversation }});
    const webhookPayload  = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });

    before(() => {
      expect(webhookEvent.payload.message.author.user).to.be.undefined
      expect(webhookEvent.payload.message.author.userId).to.be.undefined
    })

    context('if the conversation exists locally', () => {
      let conversation : Conversation

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({
          sunshineConversationId: webhookEvent.payload.conversation.id,
          customerId: null
        })
      })

      it('returns a 200', async () => {
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
      })

      it('does not create a new one', async () => {
        expect(await db.conversation.count()).to.eq(1)
        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
        expect(await db.conversation.count()).to.eq(1)
      })

      it('creates a system message', async () => {
        expect(await db.message.count()).to.eq(0)

        await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)

        expect(await db.message.count()).to.eq(1)

        const message = await db.message.findFirst();
        
        expect(message.authorType).to.eq('SYSTEM');
        expect(message.authorId).to.eq(0);
      })
    })

    context('if the conversation doesnt exist locally', () => {
      it('returns a 200', async () => {      
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .expect(200)
      })

      it('creates a conversation with no customer', async () => {
        expect(await db.conversation.count()).to.eq(0);
        
        await agent.post('/webhooks/trigger')
          .send(webhookPayload)
          .expect(200)

        expect(await db.conversation.count()).to.eq(1);

        const conversation = await db.conversation.findFirst();

        expect(conversation.customerId).to.be.null
        expect(conversation.private).to.eq(false)
        expect(conversation.readByCustomer).to.eq(false)
        expect(conversation.sunshineConversationId).to.eq(webhookEvent.payload.conversation.id)
        expect(conversation.metadata).to.deep.eq({})
      })
    })
  });
})
