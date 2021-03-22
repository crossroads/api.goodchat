import { Factory }                            from 'fishery'
import faker                                  from 'faker'
import _                                      from 'lodash'
import * as factories                         from '../index'
import { SunshineContentType, SunshineConversationShort, SunshineUser }  from '../../../lib/typings/sunshine'
import {
  WebhookEventType,
  ConversationCreatedEvent,
  ConversationMessageEvent,
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
    id: faker.random.uuid(),
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
    id: faker.random.uuid(),
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
  })[type as string]
  
  if (!factory) throw `Type ${type} not supported by Factory, add above this line.`

  return factory.build({}, { transient: { user }})
});
