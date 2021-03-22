// --------------------------
//  Sunshine Types
// --------------------------

import { Maybe, Json }  from "./goodchat";

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

export type SunshineContent = SunshineTextContent | SunshineImageContent

export type SunshineContentType = "image" | "text"

export type Metadata = Json;
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

export interface SunshineMessage {
  id:       string
  received: string
  author:  SunshineAuthor
  content: (
    SunshineImageContent |
    SunshineTextContent
  ),
  source: {
    integrationId:            string,
    originalMessageId:        string,
    originalMessageTimestamp: string,
    type:                     string
  }
}
export interface SunshineAuthor {
  avatarUrl:    string
  displayName:  string
  type:         "user" | "business"
  userId?:      string
  user?:        SunshineUser
}
export interface SunshineAuthorUser extends SunshineAuthor {
  type:        "user"
  userId:      string
  user:        SunshineUser
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
    info:           Maybe<Json>
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
