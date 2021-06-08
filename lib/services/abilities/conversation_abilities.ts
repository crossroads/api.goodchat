import { allowedConversationTypes, getConversationRules }    from "./rules"
import { CollectionArgs, normalizePages, cursorFilter }      from "./helpers"
import { ConversationType, Staff }                           from "@prisma/client"
import { throwForbidden }                                    from "../../utils/errors"
import db                                                    from "../../db"
import _                                                     from "lodash"

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

  // --- CONVERSATIONS

  /* Listing conversations I'm entitled to see */

  const getConversations = async (args: ConversationsArgs) => {
    const { after, limit } = normalizePages(args);

    const memberFilter = args.staffId ? {
      staffConversations: { some: { staffId: args.staffId } }
    } : {};

    const fieldsFilter = _.pick(args, ['type', 'id', 'customerId']);

    return db.conversation.findMany({
      take: limit,
      where: {
        AND: [
          getConversationRules(staff),
          await cursorFilter(after, 'conversation', 'updatedAt', 'desc'),
          memberFilter,
          fieldsFilter
        ]
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' }
      ]
    });
  }

  /* Fetching a single conversation, if I'm entitled to see it */

  const getConversationById = async (id: number) => {
    return (await getConversations({ id, limit: 1 }))[0] || null;
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
