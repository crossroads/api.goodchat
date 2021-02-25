import _                        from "lodash"
import { Conversation }         from "@prisma/client";
import { SunshineConversation } from "../../lib/types";
import db, { Unsaved }          from "../db"

/**
 * Creates a conversation if it doesn't already exist
 *
 * @export
 * @param {CustomerMandatoryFields} data
 * @returns {Promise<Customer>}
 */
export function initializeConversation(data: Unsaved<Conversation>) : Promise<Conversation> {
  return db.conversation.upsert({
    where: { sunshineConversationId: data.sunshineConversationId },
    create: data,
    update: _.omit(data, ['metadata', 'externalId'])
  })
}
