import * as i18nService           from '../services/i18n'
import { MessagesApi }            from 'sunshine-conversations-client'
import { createJob }              from './job'
import { unsafe }                 from '../utils/errors'
import { Json }                   from '../typings/lang'
import config                     from '../config'
import db                         from "../db"
import _                          from 'lodash'
import {
  AuthorType,
  Conversation,
  ConversationType,
  DeliveryStatus,
  Message
} from "@prisma/client"

const i18n = i18nService.initialize();

// ---------------------------
// ~ TYPES
// ---------------------------

type MessageAction = (
  //
  // Add any supported actions of this job here
  //
  "deliver"
)

// ---------------------------
// ~ ACTION METHODS
// ---------------------------

/**
 * Returns true if the message can be sent to sunshine
 *
 * @param {Conversation} conversation
 * @param {Message} message
 * @returns
 */
const canDeliverMessage = (conversation: Conversation, message: Message) => {
  return (
    conversation.type === ConversationType.CUSTOMER &&
    conversation.sunshineConversationId &&
    !message.sunshineMessageId &&
    message.authorType !== AuthorType.CUSTOMER && (
      message.customerDeliveryStatus === DeliveryStatus.UNSENT ||
      message.customerDeliveryStatus === DeliveryStatus.FAILED
    )
  )
}

/**
 * Sends a message to sunshine. Throws a goodchat error on failure
 *
 * @param {string} sunshineConversationId
 * @param {Json} content
 * @returns
 */
const postToSunshine = unsafe(async (sunshineConversationId: string, content: Json) => {
  const sunshineMessages = new MessagesApi();

  const { messages } = await sunshineMessages.postMessage(
    config.smoochAppId,
    sunshineConversationId,
    {
      "author": {
        "type": "business",
        "displayName": config.appName
      },
      "content": content
    }
  );

  return messages[0].id;
})

/**
 * Tries to send the message to sunshine and updates the local message's status
 *
 * @param {Conversation} conversation
 * @param {Message} message
 * @returns
 */
const deliverMessage = async (conversation: Conversation, message: Message) => {
  if (!canDeliverMessage(conversation, message)) return;

  try {
    //
    // Push message to sunshine
    //
    const sunshineMessageId = await postToSunshine(
      conversation.sunshineConversationId!,
      message.content
    )

    await db.message.update({
      where: { id: message.id },
      data: {
        sunshineMessageId: sunshineMessageId,
        customerDeliveryStatus: DeliveryStatus.SENT
      }
    });
  } catch (e) {
    //
    // Mark delivery as failed
    //

    const error = e instanceof Error ? e.message : i18n.__('errors.delivery_failure')

    await db.message.update({
      where: { id: message.id },
      data: {
        sunshineMessageId: null,
        customerDeliveryStatus: DeliveryStatus.FAILED,
        customerDeliveryError: error
      }
    });

    // We let the error propagate for the job to be marked as failed
    throw e;
  }
}

// ---------------------------
// ~ MESSAGE JOB
// ---------------------------

export default createJob<Message, any, MessageAction>('messages', async (job) => {
  const message = await db.message.findUnique({
    where: {
      id: job.data.id
    },
    include: {
      conversation: true
    }
  });

  if (message && job.name === "deliver") {
    await deliverMessage(message.conversation, message)
  }
})
