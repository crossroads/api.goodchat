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
export interface SunshineConversationShort {
  id:   string,
  type: string
}
export interface SunshineConversation extends SunshineConversationShort {
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
    user:         SunshineUser
  }
  content: SunshineContentBase,
  source: {
    integrationId:            string,
    originalMessageId:        string,
    originalMessageTimestamp: string,
    type:                     string
  }
}

export interface SunshineAuthor {
  type:         "user" | "business"
  userId:       string
  user:         SunshineUser
}

export interface SunshineUserProfile {
  givenName:  Maybe<string>
  surname:    Maybe<string>
  email:      Maybe<string>
  avatarUrl:  Maybe<string>
  locale:     Maybe<string>
}

export interface SunshineUser {
  id:         string
  externalId: Maybe<string>
  signedUpAt: string
  profile:    SunshineUserProfile
  metadata:   Metadata
}


export interface SunshineSource {
  type:                     string
  integrationId:            string
  originalMessageId:        string
  originalMessageTimestamp: string
  client: {
    type:           string // e.g "whatsapp"
    status:         "active" | "blocked" | "inactive" | "pending"
    integrationId:  Maybe<string>
    externalId:     Maybe<string>
    lastSeen:       Maybe<string>
    linkedAt:       Maybe<string>
    displayName:    Maybe<string>
    avatarUrl:      Maybe<string>
    info:           Maybe<Object>
  }
  device: {
    type:                   "android" | "ios" | "web"
    guid:                   string
    clientId:               string
    status:                 "active" | "inactive"
    integrationId:          string
    lastSeen:               string
    pushNotificationToken:  Maybe<string>
  }
}
