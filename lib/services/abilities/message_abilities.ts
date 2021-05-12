import { AuthorType, ConversationType, Message, Staff }             from "@prisma/client"
import _                                                            from "lodash"
import { MessagesApi }                                              from "sunshine-conversations-client"
import config                                                       from "../../config"
import db, { Unsaved }                                              from "../../db"
import { MessageContent }                                           from "../../typings/goodchat"
import { throwForbidden }                                           from "../../utils/errors"
import { conversationAbilities }                                    from "./conversation_abilities"
import { CollectionArgs, normalizePages }                           from "./helpers"
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
  const clean  = <T extends Record<any, any>>(obj: T) => _.pickBy(obj, _.identity);
  const conversations = conversationAbilities(staff);

  /* Listing messages that I have access to */

  const getMessages = async (args: MessagesArgs) => {
    const { offset, limit } = normalizePages(args);

    return db.message.findMany({
      skip: offset,
      take: limit,
      where: clean({
        conversation: getConversationRules(staff), // Prevent the user from reading messages from non-entitled conversations
        id: args.id,
        conversationId: args.conversationId
      }),
      orderBy: [
        { createdAt: args.order || 'desc' }
      ]
    })
  }

  /* Getting 1 message by ID, or null if not accessible */

  const getMessageById = async (id: number) => {
    return (await getMessages({ id, offset: 0, limit: 1 }))[0] || null;
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
