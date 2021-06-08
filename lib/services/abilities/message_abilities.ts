import { AuthorType, ConversationType, Message, Staff }             from "@prisma/client"
import _                                                            from "lodash"
import { MessagesApi }                                              from "sunshine-conversations-client"
import config                                                       from "../../config"
import db, { Unsaved }                                              from "../../db"
import { MessageContent }                                           from "../../typings/goodchat"
import { throwForbidden }                                           from "../../utils/errors"
import { conversationAbilities }                                    from "./conversation_abilities"
import { CollectionArgs, cursorFilter, normalizePages }             from "./helpers"
import { getConversationRules }                                     from "./rules"

export type MessagesArgs = CollectionArgs & {
  conversationId?: number
  id?: number
  order?: 'asc' | 'desc'
}

/**
 * Creates a set of secure methods for a certain staff member, which automatically applies any
 * security rules to the db request
 *
 * @export
 * @param {Staff} staff
 */
export function messageAbilities(staff: Staff) {

  const sunshineMessages = new MessagesApi();
  const conversations = conversationAbilities(staff);

  /* Listing messages that I have access to */

  const getMessages = async (args: MessagesArgs) => {
    const { after, limit } = normalizePages(args);

    const order = args.order || 'desc';

    const idFilter = args.id ? { id: args.id } : {}

    const conversationFilter = args.conversationId ? {
      conversationId: args.conversationId
    } : {}

    return db.message.findMany({
      take: limit,
      where: {
        AND: [
          { conversation: getConversationRules(staff) },
          idFilter,
          conversationFilter,
          await cursorFilter(after, 'message', 'createdAt', order),
        ]
      },
      orderBy: [
        { createdAt: order }
      ]
    })
  }

  /* Getting 1 message by ID, or null if not accessible */

  const getMessageById = async (id: number) => {
    return (await getMessages({ id, limit: 1 }))[0] || null;
  }

  /* Sending message to a conversation (if entitled to) */

  const sendMessage = async (conversationId: number, content: MessageContent) => {
    const conversation = await conversations.getConversationById(conversationId);

    if (conversation === null) throwForbidden();

    const unsaveMessage : Unsaved<Message> = {
      conversationId,
      content: content,
      sunshineMessageId: null,
      authorType: AuthorType.STAFF,
      authorId: staff.id,
      metadata: {}
    };

    await conversations.joinConversation(conversationId)

    if (conversation.type !== ConversationType.CUSTOMER || !config) {
      return db.message.create({ data: unsaveMessage }); // No Sunshine
    }

    let sunshineMessageId = null

    if (conversation.sunshineConversationId) {
      const { messages } = await sunshineMessages.postMessage(
        config.smoochAppId,
        conversation.sunshineConversationId,
        {
          "author": {
            "type": "business",
            "displayName": config.appName
          },
          "content": content
        }
      );

      sunshineMessageId = messages[0].id;
    }

    //
    // Note:
    // We do an upsert to handle the scenario where a webhook is fired fast enough to
    // generate a race condition
    //
    return await db.message.upsert({
      where: { sunshineMessageId },
      update: {},
      create: {
        ...unsaveMessage,
        sunshineMessageId
      }
    });
  }

  const sendTextMessage = (conversationId: number, text: string) => {
    return sendMessage(conversationId, {
      type: 'text',
      text: text
    })
  }

  return {
    getMessages,
    getMessageById,
    sendMessage,
    sendTextMessage
  }
}

export type MessageAbilties = ReturnType<typeof messageAbilities>
