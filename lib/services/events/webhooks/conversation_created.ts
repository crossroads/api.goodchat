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

import { upsertConversation }                                           from "../../sunshine";
import { registerWebhookHandler }                                       from '..'
import { ConversationCreatedEvent, WebhookEventBase, WebhookEventType } from "../../../typings/webhook_types";
import logger                                                           from '../../../utils/logger'
import { ConversationType }                                             from "@prisma/client";
import {
  initializeCustomer,
  sunshineUserToCustomer
} from "../../sunshine";

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

  await upsertConversation(payload.conversation.id, {
    sunshineConversationId: payload.conversation.id,
    customerId:             customer.id,
    source:                 payload.source.type,
    type:                   ConversationType.CUSTOMER,
    metadata:               {}
  })

  info('conversation created');
}

registerWebhookHandler(WebhookEventType.CONVERSATION_CREATE, onConversationCreated);
