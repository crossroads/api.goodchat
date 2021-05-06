import _                from "lodash"
import { Customer }     from "@prisma/client";
import db, { Unsaved }  from "../db"
import { Conversation } from "@prisma/client";
import { SunshineUser } from "../../lib/typings/sunshine";

/**
 * Generates an unsaved customer from a Sunshine User
 *
 * @export
 * @param {SunshineUser} user
 * @returns {Unsaved<Customer>}
 */
export function sunshineUserToCustomer(user: SunshineUser) : Unsaved<Customer> {
  const { profile } = user;

  const name = (profile.givenName && profile.surname) ?
    `${profile.givenName} ${profile.surname}` :
    'Anonymous'

  return {
    displayName: name,
    locale: profile.locale || 'en',
    sunshineUserId: user.id,
    externalId: null,
    metadata: {},
    email: profile.email || null,
    avatarUrl: profile.avatarUrl
  }
}

/**
 * Creates a customer if it doesn't already exist
 *
 * @export
 * @param {CustomerMandatoryFields} data
 * @returns {Promise<Customer>}
 */
export function initializeCustomer(data: Unsaved<Customer>) : Promise<Customer> {
  return db.customer.upsert({
    where: { sunshineUserId: data.sunshineUserId },
    create: data,
    update: _.omit(data, ['metadata', 'externalId'])
  })
}


/**
 * Creates a conversation if it doesn't already exist
 *
 * @exports
 * @param {Unsaved<Conversation>} data
 * @returns {Promise<Conversation>}
 */
 export const upsertConversation = async (sunshineConversationId: string, data: Unsaved<Conversation>) : Promise<Conversation> => {
  const conversation = await db.conversation.upsert({
    where: { sunshineConversationId },
    create: {
      ...data,
      sunshineConversationId
    },
    update: _.omit(data, ['metadata', 'externalId', 'source', 'customerId'])
  })

  const update : Partial<Conversation> = {};

  if (conversation.customerId === null && data.customerId !== null) {
    update['customerId'] = data.customerId
  }

  if (!conversation.source && _.isString(data.source)) {
    update['source'] = data.source
  }

  if (_.keys(update).length > 0) {
    return db.conversation.update({
      where: { id: conversation.id },
      data: update
    })
  }

  return conversation;
}
