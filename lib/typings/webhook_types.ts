import { SunshineConversationShort, SunshineUser, SunshineMessage, SunshineSource, SunshineAuthor } from "./sunshine";

export type WebhookEventType = (
  "conversation:create"   | "conversation:join"     |
  "conversation:leave"    | "conversation:remove"   |
  "conversation:message"  | "conversation:postback" |
  "conversation:read"     | "conversation:typing"   |
  "conversation:message:delivery:channel" |
  "conversation:message:delivery:failure" |
  "conversation:message:delivery:user"
)

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

export interface ConversationRemoveEvent extends WebhookEventBase {
  payload: { conversation:   SunshineConversationShort }
}



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
