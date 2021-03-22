import _                        from "lodash"
import { Conversation }         from "@prisma/client";
import db, { Unsaved }          from "../db"


/**
 * Creates a converastion if it doesnt already exsit
 *
 * @exports
 * @param {Unsaved<Conversation>} data
 * @returns {Promise<Conversation>}
 */
export const upsertConversation = (data: Unsaved<Conversation>) : Promise<Conversation> => {
  return db.conversation.upsert({
    where: { sunshineConversationId: data.sunshineConversationId },
    create: data,
    update: _.omit(data, ['metadata', 'externalId'])
  })
}
