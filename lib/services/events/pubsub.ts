import { PubSub } from 'apollo-server-koa'
import db         from '../../db'
import _          from 'lodash'

// @TODO: swap engines with the redis one: https://github.com/davidyaha/graphql-redis-subscriptions
const pubsub = new PubSub();

export enum PubSubEvents {
  MESSAGE_CREATED = 'message:new'
}

db.$use(async (params, next) => {
  const result = await next(params);

  /* Fires an event when a new message is created */
  if (params.model == 'Message' && _.includes(['create', 'upsert'], params.action)) {
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      await pubsub.publish(PubSubEvents.MESSAGE_CREATED, { message: result });
    }
  }

  return result;
})

export { pubsub }
