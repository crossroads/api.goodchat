import { AuthorType, Conversation, Customer, Message } from '@prisma/client'
import { createGoodchatServer, TestAgent }             from '../../spec_helpers/agent'
import { waitForEvent }                                from '../../../lib/utils/async'
import * as factories                                  from '../../factories'
import webhookJob                                      from '../../../lib/jobs/webhook.job'
import { expect }                                      from 'chai'
import db                                              from '../../../lib/db'
import _                                               from 'lodash'
import { storeWebhookIntegrationSecret }               from '../../../lib/routes/webhooks/setup'

const webhookIntegrationSecret = 'abcd1234'

describe('Event conversation:read', () => {
  let agent         : TestAgent

  const sunshineconversation  = factories.sunshineConversationFactory.build();
  const webhookEvent          = factories.sunshineConversationReadEventFactory.build({}, { transient: { conversation: sunshineconversation }});
  const webhookPayload        = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });

  before(async () => { [, agent] = await createGoodchatServer(); })

  beforeEach(async () => {
    await storeWebhookIntegrationSecret(webhookIntegrationSecret)
  })
  
  const trigger = async () => {
    await agent.post('/webhooks/trigger')
      .set('x-api-key', webhookIntegrationSecret)
      .send(webhookPayload)
      .expect(200)

    // Wait for the worker to pickup the job and process it
    await waitForEvent('completed', webhookJob.worker, { timeout: 500 });
  }

  context('if the customer doesn\'t exist', () => {
    it('does nothing', async () => {
      await trigger();
      expect(await db.readReceipt.count()).to.eq(0)
    })
  })

  context('if the customer exsits', () => {
    let customer  : Customer

    beforeEach(async () => {
      customer = await factories.customerFactory.create({ sunshineUserId: webhookEvent.payload.activity.author.userId })
    })

    context('but the conversation doesn\'t exist', () => {
      it('does nothing', async () => {
        await trigger();
        expect(await db.readReceipt.count()).to.eq(0)
      })
    })

    context('and the conversation exists', () => {
      let conversation  : Conversation
      let messages      : Message[]

      beforeEach(async () => {
        const now = Date.now();

        conversation = await factories.conversationFactory.create({ sunshineConversationId: sunshineconversation.id })
        messages = [
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 3000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 2000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now - 1000) })
        ]
      })

      it('creates a read receipt for the customer', async () => {
        await trigger();

        expect(await db.readReceipt.count()).to.eq(1)

        const receipt = await db.readReceipt.findFirst();

        expect(receipt.lastReadMessageId).to.eq(messages[2].id)
        expect(receipt.conversationId).to.eq(conversation.id)
        expect(receipt.userId).to.eq(customer.id)
        expect(receipt.userType).to.eq(AuthorType.CUSTOMER)
      })

      it('updates the read receipt for the customer if it already exists', async () => {
        const { id } = await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          lastReadMessageId: messages[0].id,
          userType: AuthorType.CUSTOMER,
          userId: customer.id
        })

        expect(await db.readReceipt.count()).to.eq(1)

        await trigger();

        expect(await db.readReceipt.count()).to.eq(1)

        const receipt = await db.readReceipt.findFirst();

        expect(receipt.id).to.eq(id)
        expect(receipt.lastReadMessageId).to.eq(messages[2].id)
        expect(receipt.conversationId).to.eq(conversation.id)
        expect(receipt.userId).to.eq(customer.id)
        expect(receipt.userType).to.eq(AuthorType.CUSTOMER)
      })
    })
  })
})
