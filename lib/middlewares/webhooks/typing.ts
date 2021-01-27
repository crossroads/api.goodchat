/**
 * Sunshine Content Object - Common properties
 *
 * @export
 * @interface SunshineContentBase
 */
export interface SunshineContentBase {
  type: string
}

/**
 * Sunshine Text Record
 *
 * @export
 * @interface SunshineTextContent
 * @extends {SunshineContentBase}
 */
export interface SunshineTextContent extends SunshineContentBase {
  type: "text"
  text: string
}

/**
 * Sunshine Image record
 *
 * @export
 * @interface SunshineImageContent
 * @extends {SunshineContentBase}
 */
export interface SunshineImageContent extends SunshineContentBase {
  type:       "image"
  mediaUrl:   string
  mediaType:  string,
  mediaSize:  number,
  altText:    string
}

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
    conversation: {
      id:   string,
      type: string
    }
    message: {
      id: string
      received: string
      author: {
        userId:       string
        displayName:  string
        type:         string
        user: {
          id:         string
          signedUpAt: string
          profile: {
            surname:    string,
            givenName:  string
          },
          metadata: {}
        }
      }
      content: SunshineContentBase,
      source: {
        integrationId:            string,
        originalMessageId:        string,
        originalMessageTimestamp: string,
        type:                     string
      }
    }
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
