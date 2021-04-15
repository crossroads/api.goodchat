import _                        from "lodash"
import { Conversation }         from "@prisma/client";
import db, { Unsaved }          from "../db"

/**
 * Creates a conversation if it doesn't already exist
 *
 * @exports
 * @param {Unsaved<Conversation>} data
 * @returns {Promise<Conversation>}
 */
export const upsertConversation = async (data: Unsaved<Conversation>) : Promise<Conversation> => {
  const conversation = await db.conversation.upsert({
    where: { sunshineConversationId: data.sunshineConversationId },
    create: data,
    update: _.omit(data, ['metadata', 'externalId', 'source', 'customerId'])
  })

  const update : Partial<Conversation> = {};

  if (conversation.customerId === null && data.customerId !== null) {
    update['customerId'] = data.customerId
  }

  if (conversation.source === null && data.source !== null) {
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
