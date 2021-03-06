import { createGoodchatServer, TestAgent } from '../../spec_helpers/agent'
import { WebhookEventType }                from '../../../lib/typings/webhook_types'
import { waitForEvent }                    from '../../../lib/utils/async'
import * as factories                      from '../../factories'
import webhookJob                          from '../../../lib/jobs/webhook.job'
import { expect }                          from 'chai'
import db                                  from '../../../lib/db'
import _                                   from 'lodash'
import { storeWebhookIntegrationSecret }   from '../../../lib/routes/webhooks/setup'
import {
  Conversation,
  DeliveryStatus,
  Message
} from '@prisma/client'

describe('Delivery events', () => {
  let agent         : TestAgent
  let conversation  : Conversation
  let message       : Message

  const sunshineconversation  = factories.sunshineConversationFactory.build();
  const sunshineMessage       = factories.sunshineMessageFactory.build({})

  const webhookIntegrationSecret = 'abcd1234'

  before(async () => {
    [, agent] = await createGoodchatServer();
  })

  beforeEach(async () => {
    conversation = await factories.conversationFactory.create({
      sunshineConversationId: sunshineconversation.id
    });

    message = await factories.messageFactory.create({
      conversationId: conversation.id,
      sunshineMessageId: sunshineMessage.id,
      customerDeliveryStatus: DeliveryStatus.SENT
    });

    await storeWebhookIntegrationSecret(webhookIntegrationSecret)
  })

  const trigger = async (opts: { success: boolean }) => {
    const webhookEvent = factories.sunshineMessageDeliveryEventFactory.build({
      type: opts.success ? WebhookEventType.DELIVERY_CHANNEL : WebhookEventType.DELIVERY_FAILURE,
      payload: {
        conversation: sunshineMessage,
        message: sunshineMessage
      }
    });

    const webhookPayload = factories.sunshineWebhookPayloadFactory.build({ events: [webhookEvent] });

    await agent.post('/webhooks/trigger')
      .set('x-api-key', webhookIntegrationSecret)
      .send(webhookPayload)
      .expect(200)

    // Wait for the worker to pickup the job and process it
    await waitForEvent('completed', webhookJob.worker, { timeout: 500 });
  }

  context('Event conversation:message:delivery:channel', () => {
    it('sets the delivery status to DELIVERED', async () => {
      expect(message.customerDeliveryStatus).to.eq(DeliveryStatus.SENT)

      await trigger({ success: true }); // fire the webhook

      const updatedMessage = await db.message.findUnique({
        where: { id: message.id }
      })
      expect(updatedMessage.customerDeliveryStatus).to.eq(DeliveryStatus.DELIVERED)
    })
  })

  context('Event conversation:message:delivery:failure', () => {
    it('sets the delivery status to FAILED', async () => {
      expect(message.customerDeliveryStatus).to.eq(DeliveryStatus.SENT)

      await trigger({ success: false }); // fire the webhook

      const updatedMessage = await db.message.findUnique({
        where: { id: message.id }
      })
      expect(updatedMessage.customerDeliveryStatus).to.eq(DeliveryStatus.FAILED)
    })
  })
})
