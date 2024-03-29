import { AuthorType, Conversation, ReadReceipt, Staff }  from "@prisma/client"
import { throwForbidden, throwUnprocessable, unsafe }                                from "../utils/errors"
import { ActivitiesApi }                                 from "sunshine-conversations-client"
import { abilities }                                     from "./abilities"
import config                                            from "../config"
import db                                                from "../db"
import _                                                 from "lodash"

export function activities(staff: Staff) {

  const crud = abilities(staff);
  const sunshineActivities = new ActivitiesApi();

  // --- Helpers

  const triggerSunshineActivity = unsafe(async (sunshineConversationId: string, type: string) => {
    return sunshineActivities.postActivity(config.smoochAppId, sunshineConversationId, {
      "author": {
        "type": "business"
      },
      "type": type
    });
  });

  // --- API

  const startTyping = async (conversationId: number) : Promise<Conversation> => {
    const conv = await crud.getConversationById(conversationId);

    if (!conv) { throwForbidden(); }

    if (conv.sunshineConversationId) {
      await triggerSunshineActivity(conv.sunshineConversationId, 'typing:start');
    }

    // @TODO: internal typing strategy

    return conv;
  }

  const stopTyping = async (conversationId: number) : Promise<Conversation> => {
    const conv = await crud.getConversationById(conversationId);

    if (!conv) { throwForbidden(); }

    if (conv.sunshineConversationId) {
      await triggerSunshineActivity(conv.sunshineConversationId, 'typing:stop');
    }

    // @TODO: internal typing strategy

    return conv;
  }

  const markAsRead = async (conversationId: number) : Promise<ReadReceipt|null> => {
    const conv = await crud.getConversationById(conversationId);

    if (!conv) { throwForbidden() }

    if (conv.sunshineConversationId) {
      await triggerSunshineActivity(conv.sunshineConversationId, 'conversation:read');
    }

    const [lastMessage]= await crud.getMessages({
      limit: 1,
      order: 'desc',
      conversationId: conversationId
    });

    if (!lastMessage) return null;

    return db.readReceipt.upsert({
      where: {
        userId_userType_conversationId: {
          userId: staff.id,
          userType: AuthorType.STAFF,
          conversationId: conversationId
        }
      },
      update: {
        lastReadMessageId: lastMessage.id
      },
      create: {
        lastReadMessageId: lastMessage.id,
        userId: staff.id,
        userType: AuthorType.STAFF,
        conversationId: conversationId
      }
    })
  }

  return {
    startTyping,
    stopTyping,
    markAsRead
  }
}

export type Activities = ReturnType<typeof activities>
