import { PubSub }  from 'apollo-server-koa'
import db          from '../../db'
import _           from 'lodash'
import { Message } from '@prisma/client';

// @TODO: swap engines with the redis one: https://github.com/davidyaha/graphql-redis-subscriptions
const pubsub = new PubSub();

// --------------------------------
// Types
// --------------------------------

export enum PubSubEvent {
  MESSAGE = 'message',
}

export enum PubSubAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

export interface PubSubSubscription {
  action:   PubSubAction
}

export interface MessageEvent extends PubSubSubscription {
  message:  Message
}

// --------------------------------
// Helpers
// --------------------------------

function toArray<T>(value: T|T[]) : T[] {
  if (_.isArray(value))  {
    return value;
  }
  return [value];
}

// --------------------------------
// Logic
// --------------------------------

db.$use(async (params, next) => {
  const result = await next(params);
  let action   = params.action;

  if (!_.includes(['create', 'upsert', 'delete', 'update'], action)) return result;

  if (params.model == 'Message') {
    const messages  = toArray<Message>(result);

    if (action === 'upsert') {
      action = result.createdAt.getTime() === result.updatedAt.getTime() ? 'create' : 'update';
    }

    await Promise.all(
      messages.map(message => {
        pubsub.publish(PubSubEvent.MESSAGE, { message, action })
      })
    )
  }

  return result;
})

export { pubsub }
