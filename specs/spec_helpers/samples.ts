import _ from "lodash"
import { ConversationCreatedEvent, WebhookPayload }   from "../../lib/typings/webhook_types";
import {
  SunshineConversationShort,
  SunshineSource,
  SunshineUser,
  SunshineUserProfile
} from "../../lib/typings/sunshine";

export function fakeConversation() : SunshineConversationShort {
  return {
    id: _.uniqueId("fake-conversation-id-"),
    type: "personal"
  }
}

export function fakeSource() : SunshineSource {
  return {
    type: "whatsapp",
    integrationId: "123456",
    originalMessageId: "9836282",
    originalMessageTimestamp: new Date().toISOString(),
    client: {
      type:           "whatsapp",
      status:         "active",
      integrationId:  null,
      externalId:     null,
      lastSeen:       null,
      linkedAt:       null,
      displayName:    null,
      avatarUrl:      null,
      info:           null
    },
    device: {
      type:                   "android",
      guid:                   "fakedeviceid",
      clientId:               "fakeclientid",
      status:                 "active",
      integrationId:          "fakeintegrationid",
      lastSeen:               new Date().toISOString(),
      pushNotificationToken:  null
    }
  }
}

export function fakeSunshineUserProfile() : SunshineUserProfile {
  return {
    givenName:  "Jane",
    surname:    "Doe",
    email:      "jane@gmail.com",
    avatarUrl:  null,
    locale:     null
  }
}

export function fakeSunshineUser() : SunshineUser {
  return {
    id: _.uniqueId("fake-user-id-"),
    externalId: null,
    signedUpAt: new Date().toISOString(),
    profile: fakeSunshineUserProfile(),
    metadata: {}
  }
}

export function fakeWebhookEvent() : ConversationCreatedEvent {
  const uid = _.uniqueId("fake-user-id-");

  return {
    id:           _.uniqueId("fake-event-id-"),
    createdAt:    new Date().toISOString(),
    type:         'conversation:create',
    payload: {
      conversation: fakeConversation(),
      user: fakeSunshineUser(),
      source: fakeSource(),
      creationReason: "message"
    }
  }
}

export function fakeWebhookPayload() {
  return {
    app: {
      id: "fakeappid"
    },
    webhook: {
      id:       "fakewebhookid",
      version:  "2"
    },
    events: [fakeWebhookEvent()] 
  }
}

