import { allowedConversationTypes, getConversationRules }    from "./rules"
import { CollectionArgs, normalizePages, cursorFilter }      from "./helpers"
import { throwForbidden, throwUnprocessable }                from "../../utils/errors"
import { ConversationType, Staff }                           from "@prisma/client"
import { Json }                                              from "../../typings/lang"
import db                                                    from "../../db"
import _                                                     from "lodash"

export type ConversationsArgs = CollectionArgs & {
  customerId?: number
  staffId?: number
  type?: ConversationType
  id?: number,
  tagIds?: number[]
}

export type NewConversationProps = {
  type : ConversationType,
  memberIds: number[],
  metadata?: Json
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

    const { tagIds = [] } = args;

    const tagFilter = tagIds.length === 0 ? {} : ({
      tags: {
        some: {
          tag: {
            id: { in: tagIds }
          }
        }
      }
    });

    return db.conversation.findMany({
      take: limit,
      where: {
        AND: [
          getConversationRules(staff),
          await cursorFilter(after, 'conversation', 'updatedAt', 'desc'),
          memberFilter,
          fieldsFilter,
          tagFilter
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

  /* Creating a new conversation */

  const createConversation = async (props : NewConversationProps) => {
    if (props.type === ConversationType.CUSTOMER) {
      throwForbidden("errors.conversation.creation.forbidden_type_customer")
    }

    const members = _.uniq([staff.id, ...props.memberIds]).map((staffId) => ({ staffId }))

    if (members.length <= 1) {
      throwUnprocessable("errors.conversation.creation.forbidden_empty_conversation")
    }

    return db.conversation.create({
      data: {
        source: "goodchat",
        type: props.type,
        metadata: props.metadata || {},
        staffConversations: {
          createMany: {
            skipDuplicates: true,
            data: members
          }
        }
      }
    })
  }

  const touchConversation = async (conversationId : number) => {
    await db.conversation.updateMany({
      where: {
        AND: [
          getConversationRules(staff),
          { id: conversationId }
        ]
      },
      data: { updatedAt: new Date() }
    })
  }

  return {
    getConversations,
    getConversationById,
    joinConversation,
    addToConversation,
    createConversation,
    touchConversation
  }
}

export type ConversationAbilities = ReturnType<typeof conversationAbilities>
