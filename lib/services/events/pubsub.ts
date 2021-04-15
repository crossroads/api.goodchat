import { PubSub }          from 'apollo-server-koa'
import db                  from '../../db'
import _                   from 'lodash'
import { Message, Prisma } from '@prisma/client';

// @TODO: swap engines with the redis one: https://github.com/davidyaha/graphql-redis-subscriptions
const pubsub = new PubSub();

// --------------------------------
// Types & Enums
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

const UNSUPPORTED = 'unsupported';

const EVENT_PER_MODEL = {
  'Message': PubSubEvent.MESSAGE
}

type EventModelMap = typeof EVENT_PER_MODEL

const SUPPORTED_MODELS = _.keys(EVENT_PER_MODEL);

// --------------------------------
// Helpers
// --------------------------------

/**
 * Checks if the record has had any updates using its timestamps
 *
 * @param {*} obj
 * @returns {boolean}
 */
function isFreshRecord(obj?: any) : boolean {
  const createdAt = obj?.createdAt;
  const updatedAt = obj?.updatedAt;

  return (
    _.isDate(createdAt) &&
    _.isDate(updatedAt) &&
    createdAt.getTime() === updatedAt.getTime()
  )
}

/**
 * Given a Prisma Method, returns a simple create/update/delete event name
 *
 * @param {string} action
 * @param {*} result
 * @returns {(string | "unsupported")}
 */
function normalizeEventName(action: string, result?: any) : string | "unsupported" {
  if (action === 'upsert') {
    return isFreshRecord(result) ? 'create' : 'update';
  }

  if (!_.includes([
    'create',
    'delete',
    'deleteMany',
    'update',
    'updateMany'
  ], action)) return UNSUPPORTED;

  return action.replace(/Many$/, '');
}

function isSupportedModel(model?: string) : model is (keyof EventModelMap)  {
  return _.includes(SUPPORTED_MODELS, model);
}

function isManyAction(params : Prisma.MiddlewareParams) {
  return /Many$/.test(params.action);
}

/**
 * Given a 'xxxMany' Prisma action, returns the record ids which will be affected by the change
 *
 * @param {Prisma.MiddlewareParams} params
 * @returns {Promise<number[]>}
 */
async function getManyRecords(collection: string, params : Prisma.MiddlewareParams) : Promise<any[]> {
  if (!_.includes(['updateMany', 'deleteMany'], params.action)) {
    return [];
  }

  return await (db as any)[collection].findMany({
    where: _.get(params, 'args.where', {})
  })
}

/**
 * Reload a batch of records of a given collection
 *
 * @param {string} collection
 * @param {number[]} ids
 * @returns
 */
async function reloadRecords(collection: string, records: any[]) : Promise<any[]> {
  return (db as any)[collection].findMany({
    where: {
      id: {
        in: _.map(records, 'id')
      }
    }
  });
}

// --------------------------------
// Logic
// --------------------------------

// @TODO: Run publishes in a job (bull/kue?)

db.$use(async (params : Prisma.MiddlewareParams, next) => {
  const { model } = params;

  // Case: An event we don't care about
  if (!isSupportedModel(model)) {
    return next(params);
  }

  const collectionName = _.toLower(params.model)

  if (isManyAction(params)) {
    // Case: An batch event
    const event = normalizeEventName(params.action);
    const isDelete = /delete/.test(params.action);

    // Figure out which records are going to be affected
    const recordsBeforeOperation = await getManyRecords(collectionName, params);

    // Run the operation
    const result = await next(params);

    if (result.count > 0) {
      const records = (
        isDelete ? recordsBeforeOperation : await reloadRecords(collectionName, recordsBeforeOperation)
      );

      // Send the records across
      await Promise.all(
        records.map(record => {
          pubsub.publish(EVENT_PER_MODEL[model], {
            [collectionName]: record,
            action: event
          })
        })
      )
    }

    return result;
  }

  const result = await next(params);
  const event  = normalizeEventName(params.action, result);

  if (event !== UNSUPPORTED) {
    pubsub.publish(EVENT_PER_MODEL[model], {
      [collectionName]: result,
      action: event
    })
  }

  return result;
})

export { pubsub }
