import { Factory }                                                       from 'fishery'
import faker                                                             from 'faker'
import _                                                                 from 'lodash'
import * as factories                                                    from '../index'
import { SunshineContentType, SunshineConversationShort, SunshineUser }  from '../../../lib/typings/sunshine'
import {
  WebhookEventType,
  ConversationCreatedEvent,
  ConversationMessageEvent,
  ConversationActivityEvent,
  MessageDeliveryEvent,
  WebhookEvent
} from '../../../lib/typings/webhook_types'

interface BaseWebhookEventFactoryParams {
  user?: SunshineUser
  conversation?: SunshineConversationShort
}

/**
 * Creates a fake WebhookEvent record for the "conversation:create" type
 *
 * @type {Factory<ConversationCreatedEvent>}
 * @exports
 */
export const sunshineNewConversationEventFactory = Factory.define<ConversationCreatedEvent, BaseWebhookEventFactoryParams>((opts) => {
  const conversation = opts.transientParams.conversation || factories.sunshineConversationShortFactory.build();

  return {
    id: faker.datatype.uuid(),
    createdAt: faker.date.recent().toISOString(),
    type: WebhookEventType.CONVERSATION_CREATE,
    payload: {
      conversation:   _.pick(conversation, 'id', 'type'),
      user:           opts.transientParams.user || factories.sunshineUserFactory.build(),
      source:         factories.sunshineSourceFactory.build(),
      creationReason: "message"
    }
  }
});

// -------------- New Message Event -------------- //

interface ConversationMessageEventFactoryParams extends BaseWebhookEventFactoryParams {
  contentType?: SunshineContentType
}

/**
 * Creates a fake WebhookEvent record for the "conversation:message" type
 *
 * @type {Factory<ConversationMessageEvent>}
 * @exports
 */
export const sunshineNewMessageEventFactory = Factory.define<ConversationMessageEvent, ConversationMessageEventFactoryParams>((opts) => {
  const user = opts.transientParams.user || factories.sunshineUserFactory.build();
  const conversation = opts.transientParams.conversation || factories.sunshineConversationShortFactory.build();

  return {
    id: faker.datatype.uuid(),
    createdAt: faker.date.recent().toISOString(),
    type: WebhookEventType.CONVERSATION_MESSAGE,
    payload: {
      conversation:         _.pick(conversation, 'id', 'type'),
      message:              factories.sunshineMessageFactory.build({
        ..._.get(opts.params, 'payload.message', {})
      }, {
        transient: { user, contentType: opts.transientParams.contentType }
      }),
      recentNotifications:  [],
      user
    }
  }
});


// -------------- Conversation Read Event -------------- //

/**
 * Creates a fake WebhookEvent record for the "conversation:read" type
 *
 * @type {Factory<ConversationActivityEvent>}
 * @exports
 */
export const sunshineConversationReadEventFactory = Factory.define<ConversationActivityEvent, BaseWebhookEventFactoryParams>((opts) => {
  const user = opts.transientParams.user || factories.sunshineUserFactory.build();
  const conversation = opts.transientParams.conversation || factories.sunshineConversationShortFactory.build();

  return {
    id: faker.datatype.uuid(),
    createdAt: faker.date.recent().toISOString(),
    type: WebhookEventType.CONVERSATION_READ,
    payload: {
      conversation: conversation,
      activity: {
        type: "conversation:read",
        source: factories.sunshineSourceFactory.build(),
        author: {
          avatarUrl: user.profile.avatarUrl,
          displayName: user.profile.givenName,
          userId: user.id,
          type: "user",
          user: user
        }
      }
    }
  }
});

// -------------- Delivery Success Event -------------- //

/**
 * Creates a fake WebhookEvent record for the types:
 *  - "conversation:message:delivery:channel"
 *  - "conversation:message:delivery:failure"
 *
 * @type {Factory<ConversationActivityEvent>}
 * @exports
 */
export const sunshineMessageDeliveryEventFactory = Factory.define<MessageDeliveryEvent, BaseWebhookEventFactoryParams>((opts) => {
  const user = opts.transientParams.user || factories.sunshineUserFactory.build();
  const conversation = opts.transientParams.conversation || factories.sunshineConversationShortFactory.build();

  opts.afterBuild((data) => {
    if (data.type === WebhookEventType.DELIVERY_FAILURE) {
      data.payload.error = {
        code: "bad_request",
        underlyingError: {
          message: "This message is being sent outside the allowed window",
          type: "OAuthException",
          code: 10
        }
      }
    }
  })

  return {
    id: faker.datatype.uuid(),
    createdAt: faker.date.recent().toISOString(),
    type: WebhookEventType.DELIVERY_CHANNEL,
    payload: {
      conversation: conversation,
      message: factories.sunshineMessageFactory.build({}, { transient: { user } })
    }
  }
});

// -------------- Generic Event -------------- //

interface DynamicWebhookEventFactoryParams extends BaseWebhookEventFactoryParams {
  type?: WebhookEventType
}

/**
 * Creates a fake WebhookEvent based on the type passed as transient params
 *
 * @type {Factory<ConversationMessageEvent>}
 * @exports
 */
export const sunshineWebhookEventFactory = Factory.define<WebhookEvent, DynamicWebhookEventFactoryParams>((opts) => {
  const {
    type = WebhookEventType.CONVERSATION_CREATE,
    user = factories.sunshineUserFactory.build()
  } = opts.transientParams

  const factory = ({
    [WebhookEventType.CONVERSATION_CREATE]: sunshineNewConversationEventFactory,
    [WebhookEventType.CONVERSATION_MESSAGE]: sunshineNewMessageEventFactory,
    [WebhookEventType.CONVERSATION_READ]: sunshineConversationReadEventFactory,
    [WebhookEventType.DELIVERY_CHANNEL]: sunshineMessageDeliveryEventFactory,
  })[type as string]

  if (!factory) throw `Type ${type} not supported by Factory, add above this line.`

  return factory.build({}, { transient: { user }})
});
