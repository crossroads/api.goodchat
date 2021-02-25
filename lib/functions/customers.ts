import _                from "lodash"
import { Customer }     from "@prisma/client";
import { SunshineUser } from "../../lib/types";
import db, { Unsaved }  from "../db"

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
