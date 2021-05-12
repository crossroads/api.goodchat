/*
 * This function handles incoming "conversation:read" Webhook events from sunshine
 * This event is fired when a user reads a conversation
 *
 * Actions taken:
 *  - Find the last message of the conversation
 *  - Create or update a read receipt record
 *
 * Reference: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 */

import { initializeCustomer, sunshineUserToCustomer }   from '../../sunshine';
import { SunshineAuthor, SunshineAuthorUser }           from '../../../typings/sunshine'
import { registerWebhookHandler }                       from '..'
import { AuthorType }                                   from "@prisma/client"
import  db                                              from "../../../db"
import {
  ConversationActivityEvent,
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
 * Webhook handler
 *
 * @export
 * @param {ConversationActivityEvent} event
 * @returns {Promise<void>}
 */
export async function onConversationRead(event: WebhookEventBase) : Promise<void> {
  const { payload } = <ConversationActivityEvent>event;

  // Get the conversation and customer

  const customerId = await getCustomerId(payload.activity.author);
  const conversation = await db.conversation.findUnique({
    where: {
      sunshineConversationId: payload.conversation.id
    }
  });

  if (!conversation || !customerId) return;

  // Get the last message

  const lastMessage = await db.message.findFirst({
    where: { conversationId: conversation.id },
    orderBy: [{ createdAt: 'desc' }]
  });

  if (!lastMessage) return;

  // Create or update the read receipt

  const identityFields = {
    userId: customerId,
    userType: AuthorType.CUSTOMER,
    conversationId: conversation.id
  };

  const messageFields = {
    lastReadMessageId: lastMessage.id
  };

  await db.readReceipt.upsert({
    where: { userId_userType_conversationId: identityFields },
    update: messageFields,
    create: {
      ...identityFields,
      ...messageFields
    }
  });
}

registerWebhookHandler(WebhookEventType.CONVERSATION_READ, onConversationRead);
