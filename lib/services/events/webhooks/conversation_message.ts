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

import { registerWebhookHandler }          from '..'
import  db                                 from "../../../db";
import { AuthorType }                      from "@prisma/client";
import * as assert                         from '../../../utils/assertions'
import {
  ConversationMessageEvent,
  WebhookEventBase,
  WebhookEventType
} from "../../../typings/webhook_types";

/**
 *
 *
 * @export
 * @param {ConversationCreatedEvent} event
 * @returns {Promise<void>}
 */
export async function onMessageCreated(event: WebhookEventBase) : Promise<void> {
  // @TODO 

  // const { payload } = (<ConversationMessageEvent>event);
  
  // const conversation = await db.conversation.findUnique({ where: {
  //   sunshineConversationId: payload.conversation.id
  // }})

  // assert.exists(conversation, 'errors.conversation_not_found');
  
  // const customer = await db.customer.findUnique({
  //   where: { sunshineUserId: payload.message.author.user.id }
  // })

  // assert.exists(customer, 'errors.customer_not_found');

  // await db.message.create({
  //   data: {
  //     conversationId: conversation.id,
  //     authorType: AuthorType.CUSTOMER,
  //     authorId: customer.id,
  //     content: { ...payload.message.content },
  //     metadata: {}
  //   }
  // })
}

registerWebhookHandler(WebhookEventType.CONVERSATION_MESSAGE, onMessageCreated);
