import { ConversationType, Staff }                           from "@prisma/client"
import _                                                     from "lodash"
import db                                                    from "../../db"
import { throwForbidden }                                    from "../../utils/errors"
import { CollectionArgs, normalizePages }                    from "./helpers"
import { allowedConversationTypes, getConversationRules }    from "./rules"

export type ConversationsArgs = CollectionArgs & {
  customerId?: number
  staffId?: number
  type?: ConversationType
  id?: number
}

// ---------------------------
// Module
// ---------------------------

export function conversationAbilities(staff: Staff) {

  const clean  = <T extends Record<any, any>>(obj: T) => _.pickBy(obj, (it) => (
    it !== undefined && it !== null
  ))

  // --- CONVERSATIONS

  /* Listing conversations I'm entitled to see */

  const getConversations = async (args: ConversationsArgs) => {
    const { offset, limit } = normalizePages(args);

    const memberFilter = args.staffId ? {
      staffConversations: { some: { staffId: args.staffId } }
    } : {};

    return db.conversation.findMany({
      skip: offset,
      take: limit,
      where: clean({
        ...getConversationRules(staff),
        ..._.pick(args, ['type', 'id', 'customerId']),
        ...(memberFilter)
      }),
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ]
    });
  }

  /* Fetching a single conversation, if I'm entitled to see it */

  const getConversationById = async (id: number) => {
    return (await getConversations({ id, offset: 0, limit: 1 }))[0] || null;
  }

  /* Adding a staff member to a conversation that I have access to */

  const addToConversation = async (id: number, user: Staff) => {
    const allowedTypes = allowedConversationTypes(user);
    const conversation = await getConversationById(id);

    if (!conversation) {
      // I can't add someone to a conversation I don't have access to
      throwForbidden();
    }

    if (_.includes(allowedTypes, conversation.type) === false) {
      // I can't add someone to a conversation that they are not allowed to see
      throwForbidden();
    }

    const compoundId = {
      staffId: user.id,
      conversationId: id
    }

    return db.staffConversations.upsert({
      where: {
        staffId_conversationId: compoundId
      },
      update: {},
      create: { ...compoundId },
    })
  }

  /* Adding myself to a conversation that I have access to */

  const joinConversation = async (id: number) => {
    return addToConversation(id, staff); // adding myself to a conversation
  }

  return {
    getConversations,
    getConversationById,
    joinConversation,
    addToConversation
  }
}

export type ConversationAbilities = ReturnType<typeof conversationAbilities>
