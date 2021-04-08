import { ConversationType, Staff }         from "@prisma/client";
import _                                   from "lodash";
import db                                  from "../../db";
import { getAbilities }                    from "../../services/abilities";

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
 * Creates a data reader for a certain staff member, which automatically applies any
 * security rules to the db request
 *
 * @export
 * @param {Staff} staff
 */
export function dataReader(staff: Staff) {

  const clean  = <T extends Record<any, any>>(obj: T) => _.pickBy(obj, _.identity);

  const getConversations = async (args: ConversationArgs) => {
    const { offset, limit } = normalizePages(args);

    return db.conversation.findMany({
      skip: offset,
      take: limit,
      where: clean({
        ...getAbilities(staff, 'conversation'),
        ..._.pickBy(args, ['type', 'id', 'customerId'])
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

  const getMessages = async (args: MessageArgs) => {
    const { offset, limit } = normalizePages(args);

    return db.message.findMany({
      skip: offset,
      take: limit,
      where: clean({
        conversation: getAbilities(staff, 'conversation'), // Prevent the user from reading messages from non-entitled conversations
        id: args.id,
        conversationId: args.conversationId
      })
    })
  }

  const getMessage = async (id: number) => {
    return (await getMessages({ id, offset: 0, limit: 1 }))[0] || null;
  }

  return {
    getConversations,
    getConversationById,
    getMessages,
    getMessage
  }
}

export type DataReader = ReturnType<typeof dataReader>
