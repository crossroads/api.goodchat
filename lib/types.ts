import { I18n }               from "i18n"
import Koa                    from "koa"

export type Maybe<T> = T|null 

export enum GoodChatAuthMode {
  JWT =   "jwt",
  NONE =  "none"
}

export interface GoodChatConfig {
  smoochAppId:            string
  smoochApiKeyId:         string
  smoochApiKeySecret:     string
  goodchatHost:           string
  authMode:               GoodChatAuthMode
}

export interface KoaChatContext extends Koa.Context {
  config: GoodChatConfig,
  i18n:   I18n
}

export interface KoaChatState extends Koa.DefaultState {
  // add custom state props here
}

export type GoodchatApp = Koa<KoaChatContext, KoaChatState>;

// --------------------------
//  Sunshine Types
// --------------------------


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

export interface Metadata {
  [key: string]: string|number|boolean
}
export interface ConversationShort {
  id:   string,
  type: string
}
export interface Conversation extends ConversationShort {
  isDefault:        boolean
  displayName:      string
  description:      string
  iconUrl:          string
  metadata:         Metadata
  businessLastRead: string
  lastUpdatedAt:    string
}


export interface Message {
  id:       string
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

export interface UserProfile {
  givenName:  string
  surname:    string
  email:      string
  avatarUrl:  string
  locale:     string
}

export interface User {
  id:         string
  externalId: string
  signedUpAt: string
  profile:    UserProfile
  metadata:   Metadata
}
