import _                      from "lodash"
import EventEmitter           from "events"

import {
  initializeCustomer,
  sunshineUserToCustomer
} from "../../lib/functions/customers"

import { initializeConversation } from "../../lib/functions/conversations"

import {
  ConversationCreatedEvent,
  WebhookEventBase
} from "../middlewares/webhooks/typing"

const emitter = new EventEmitter();

const webhookHandlers = {
  "conversation:create": async (event: ConversationCreatedEvent) => {
    const customer = await initializeCustomer(sunshineUserToCustomer(event.payload.user));
    
    await initializeConversation({
      sunshineConversationId: event.payload.conversation.id,
      customerId: customer.id,
      source: event.payload.source.type,
      readByCustomer: true,
      private: false,
      metadata: {}
    })
  }
}

/**
 * Handles
 *
 * @export
 * @param {WebhookEventBase} type
 * @param {WebhookPayload} payload
 */
export async function handleWebhookEvent(event: WebhookEventBase) {
  await _.get(webhookHandlers, event.type, _.noop)(event)

  emitter.emit('webhook', event)
  emitter.emit(`webhook:${event.type}`, event)
}

export default emitter;
