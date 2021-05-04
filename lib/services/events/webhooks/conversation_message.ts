/*
 * This function handles incoming "conversation:message" Webhook events from sunshine
 * This event is fired when a user sends a message
 *
 * Actions taken:
 *  - Create a local message in the database
 *
 * Reference: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 * Created on Thu Mar 11 2021
 *
 * Copyright (c) 2021 Crossroads Foundation
 */

import { initializeCustomer, sunshineUserToCustomer }   from '../../customer_service';
import { SunshineAuthor, SunshineAuthorUser }           from '../../../typings/sunshine'
import { registerWebhookHandler }                       from '..'
import { upsertConversation }                           from '../../conversation_service'
import { AuthorType, ConversationType }                 from "@prisma/client"
import  db                                              from "../../../db"
import {
  ConversationMessageEvent,
  WebhookEventBase,
  WebhookEventType
} from "../../../typings/webhook_types";

async function getCustomerId(author: SunshineAuthor) : Promise<number|null> {
  if (author.type !== 'user') return null;

  const sunshineUser = (<SunshineAuthorUser>author).user;
  const customer = await initializeCustomer(sunshineUserToCustomer(sunshineUser))

  return customer.id;
}

/**
 *
 *
 * @export
 * @param {ConversationMessageEvent} event
 * @returns {Promise<void>}
 */
export async function onMessageCreated(event: WebhookEventBase) : Promise<void> {
  const { payload } = (<ConversationMessageEvent>event);
  const customerId  = await getCustomerId(payload.message.author);

  const conversation = await upsertConversation(payload.conversation.id, {
    sunshineConversationId: payload.conversation.id,
    readByCustomer:         customerId !== null,
    customerId:             customerId,
    metadata:               {},
    type:                   ConversationType.CUSTOMER,
    source:                 payload.message.source.type
  })

  await db.message.upsert({
    where: { sunshineMessageId: payload.message.id },
    create: {
      createdAt: new Date(payload.message.received),
      updatedAt: new Date(payload.message.received),
      sunshineMessageId: payload.message.id,
      conversationId: conversation.id,
      content: { ...payload.message.content },
      metadata: {},
      //  === Author ===
      //
      //  If a message comes in as a "business" type, aka non-user, such as an unknow third party integration, e.g Slack
      //  we mark it as a "system" message since we don't know who sends it
      //
      //  Note: messages sent from Goodchat would also come in as "business" messages, but they would already be in the system
      //
      authorType: customerId ? AuthorType.CUSTOMER : AuthorType.SYSTEM,
      authorId: customerId ?? 0
    },
    update: {
      // Sunshine messages are immutable. If the message is already in the system we don't need to update anything
    }
  })
}

registerWebhookHandler(WebhookEventType.CONVERSATION_MESSAGE, onMessageCreated);
