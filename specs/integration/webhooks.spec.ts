import { expect, assert }     from 'chai'
import _                      from 'lodash'
import db                     from '../../lib/db'
import { GoodchatApp }        from '../../lib/types'
import { fakeWebhookPayload } from '../spec_helpers/samples'
import {
  createGoodchatServer,
  TestAgent
} from '../spec_helpers/agent'

const webhookPayload  = fakeWebhookPayload();
const webhookEvent    = webhookPayload.events[0];

describe('Webhooks Integration', () => {
  let agent : TestAgent
  let app   : GoodchatApp

  before(async () => {
    [app, agent] = await createGoodchatServer();
  })

  context('when a new conversation is created', () => {
    beforeEach(async () => {
      expect(await db.conversation.count()).to.eq(0)
      expect(await db.customer.count()).to.eq(0)
      await agent.post('/webhooks/trigger').send(webhookPayload).expect(200)
    });

    it('creates a Conversation record', async () => {
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
      expect(await db.customer.count()).to.eq(1)

      const customer = await db.customer.findFirst({}) as any

      assert.isNotNull(customer)
      expect(customer.displayName).to.eq('Jane Doe')
      expect(customer.email).to.eq('jane@gmail.com')
      expect(customer.externalId).to.be.null
      expect(customer.locale).to.eq('en')
      expect(customer.metadata).to.deep.eq({})
      expect(customer.sunshineUserId).to.eq(webhookEvent.payload.user.id)
    })
  })
});
