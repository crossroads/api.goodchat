/*
 * This function handles incoming "conversation:create" Webhook events from sunshine
 *
 * Actions taken:
 *  - Create or update the local Customer record 
 *  - Create or update the local Conversation record
 * 
 * Reference: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 * Created on Thu Mar 11 2021
 *
 * Copyright (c) 2021 Crossroads Foundation
 */

import { upsertConversation }                                           from "../../conversation_service";
import { registerWebhookHandler }                                       from '..'
import { ConversationCreatedEvent, WebhookEventBase, WebhookEventType } from "../../../typings/webhook_types";
import logger                                                           from '../../../utils/logger'
import {
  initializeCustomer,
  sunshineUserToCustomer
} from "../../customers";

const { info } = logger('events');

/**
 *
 * @export
 * @param {ConversationCreatedEvent} event
 * @returns {Promise<void>}
 */
export async function onConversationCreated(event: WebhookEventBase) : Promise<void> {
  const payload = (<ConversationCreatedEvent>event).payload;
  const customer = await initializeCustomer(sunshineUserToCustomer(payload.user));

  await upsertConversation({
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
