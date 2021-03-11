import { initializeConversation }                                       from "../../conversations";
import { registerWebhookHandler }                                       from '../index'
import { ConversationCreatedEvent, WebhookEventBase, WebhookEventType } from "../../../typings/webhook_types";
import logger                                                           from '../../../utils/logger'
import {
  initializeCustomer,
  sunshineUserToCustomer
} from "../../customers";

const { info } = logger('events');

/**
 * Handles the case where a conversation is created by sunshine
 *
 * @export
 * @param {ConversationCreatedEvent} event
 * @returns {Promise<void>}
 */
export async function onConversationCreated(event: WebhookEventBase) : Promise<void> {
  const payload = (<ConversationCreatedEvent>event).payload;
  const customer = await initializeCustomer(sunshineUserToCustomer(payload.user));

  await initializeConversation({
    sunshineConversationId: payload.conversation.id,
    customerId:             customer.id,
    source:                 payload.source.type,
    readByCustomer:         true,
    private:                false,
    metadata:               {}
  })

  info('conversation created');
}

registerWebhookHandler(WebhookEventType.CONVERSATION_CREATE, onConversationCreated);
