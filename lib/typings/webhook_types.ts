import { SunshineConversationShort, SunshineUser, SunshineMessage, SunshineSource, SunshineAuthor } from "./sunshine";

export enum WebhookEventType {
  CONVERSATION_CREATE     = "conversation:create",
  CONVERSATION_JOIN       = "conversation:join",
  CONVERSATION_LEAVE      = "conversation:leave",
  CONVERSATION_REMOVE     = "conversation:remove",
  CONVERSATION_MESSAGE    = "conversation:message",
  CONVERSATION_POSTBACK   = "conversation:postback",
  CONVERSATION_READ       = "conversation:read",
  CONVERSATION_TYPING     = "conversation:typing",
  DELIVERY_CHANNEL        = "conversation:message:delivery:channel",
  DELIVERY_FAILURE        = "conversation:message:delivery:failure",
  DELIVERY_USER           = "conversation:message:delivery:user"
}

/**
 * Sunshine Webhook Record
 *
 * Documented here: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 * @export
 * @interface WebhookEvent
 */
export interface WebhookEventBase {
  id:         string
  createdAt:  string
  type:       WebhookEventType
}

export interface ConversationCreatedEvent extends WebhookEventBase {
  payload: {
    conversation:   SunshineConversationShort
    creationReason: string
    user:           SunshineUser
    source:         SunshineSource
  }
}

export interface ConversationMessageEvent extends WebhookEventBase {
  payload: {
    conversation:         SunshineConversationShort,
    message:              SunshineMessage,
    recentNotifications:  SunshineMessage[]
  }
}

export interface ConversationActivityEvent extends WebhookEventBase {
  payload: {
    conversation:  SunshineConversationShort,
    activity: {
      type:   "conversation:read" | "typing:start" | "typing:stop"
      source: SunshineSource
      author: SunshineAuthor
    }
  }
}

export interface MessageDeliveryEvent extends WebhookEventBase {
  type:  WebhookEventType.DELIVERY_CHANNEL | WebhookEventType.DELIVERY_FAILURE
  payload: {
    conversation: SunshineConversationShort,
    message: SunshineMessage,
    error?: {
      code: string
      underlyingError: {
        message: string
        type: string
        code: number
      }
    }
  }
}

export interface ConversationRemoveEvent extends WebhookEventBase {
  payload: { conversation: SunshineConversationShort }
}

export type WebhookEvent = (
  ConversationCreatedEvent  |
  ConversationMessageEvent  |
  ConversationActivityEvent |
  ConversationRemoveEvent
)


/**
 * Webhook payload
 *
 * Documented here: https://docs.smooch.io/rest/#operation/eventWebhooks
 *
 * @export
 * @interface WebhookPayload
 */
export interface WebhookPayload {
  app: {
    id: string
  }
  webhook: {
    id:       string
    version:  string
  }
  events: Array<WebhookEventBase>
}
