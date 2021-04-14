import { ConversationType, Staff }         from "@prisma/client"
import _                                   from "lodash"
import db                                  from "../../db"
import { getConversationRules }            from "./rules"

export type Pagination = {
  limit:   number
  offset:  number
}

export type CollectionArgs = Partial<Pagination>

export type ConversationArgs = CollectionArgs & {
  type?: ConversationType
  customerId?: number
  id?: number
}

export type MessageArgs = CollectionArgs & {
  conversationId?: number
  id?: number
}

export type WhereClause = Record<string, any>

// ---------------------------
// Helpers
// ---------------------------

const normalizePages = (args: CollectionArgs) : Pagination => {
  return {
    limit: _.clamp(args.limit || 25, 0, 100),
    offset: _.clamp(args.offset || 0, 0, 100),
  }
}

// ---------------------------
// Module
// ---------------------------

/**
 * Creates a set of secure methods for a certain staff member, which automatically applies any
 * security rules to the db request
 *
 * @export
 * @param {Staff} staff
 */
export function abilities(staff: Staff) {

  const clean  = <T extends Record<any, any>>(obj: T) => _.pickBy(obj, _.identity);


  // --- CONVERSATIONS

  const getConversations = async (args: ConversationArgs) => {
    const { offset, limit } = normalizePages(args);

    return db.conversation.findMany({
      skip: offset,
      take: limit,
      where: clean({
        ...getConversationRules(staff),
        ..._.pick(args, ['type', 'id', 'customerId'])
      }),
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ]
    });
  }

  const getConversationById = async (id: number) => {
    return (await getConversations({ id, offset: 0, limit: 1 }))[0] || null;
  }

  // --- MESSAGES

  const getMessages = async (args: MessageArgs) => {
    const { offset, limit } = normalizePages(args);

    return db.message.findMany({
      skip: offset,
      take: limit,
      where: clean({
        conversation: getConversationRules(staff), // Prevent the user from reading messages from non-entitled conversations
        id: args.id,
        conversationId: args.conversationId
      })
    })
  }

  const getMessageById = async (id: number) => {
    return (await getMessages({ id, offset: 0, limit: 1 }))[0] || null;
  }

  return {
    getConversations,
    getConversationById,
    getMessages,
    getMessageById
  }
}

export type Abilities = ReturnType<typeof abilities>
