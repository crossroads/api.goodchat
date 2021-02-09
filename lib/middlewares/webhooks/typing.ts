import { ConversationShort, Message } from "lib/types"

/**
 * Sunshine Webhook Record
 *
 * @export
 * @interface WebhookEvent
 */
export interface WebhookEvent {
  id:         string
  createdAt:  string
  type:       string
  payload:    {
    conversation: ConversationShort
    message:      Message
  }
}

export interface WebhookPayload {
  app: {
    id: string
  }
  webhook: {
    id:       string
    version:  string
  }
  events: Array<WebhookEvent>
}
