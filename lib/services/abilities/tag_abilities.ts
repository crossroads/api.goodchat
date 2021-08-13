import { conversationAbilities }  from "./conversation_abilities"
import { throwNotFound }          from "../../utils/errors"
import { Staff }                  from "@prisma/client"
import db                         from "../../db"
import _                          from "lodash"


/**
 * Creates a set of secure methods for a certain staff member, which automatically applies any
 * security rules to the db request
 *
 * @export
 * @param {Staff} staff
 */
export function tagAbilities(staff: Staff) {

  const conversations = conversationAbilities(staff);

  const tagConversation = async (conversationId: number, tagId: number) => {
    const conversation = await conversations.getConversationById(conversationId);

    if (!conversation) throwNotFound();

    // Check if the conversation is already tagged

    const existingRecord = await db.conversationTags.findUnique({
      where: {
        tagId_conversationId: {
          conversationId, tagId
        }
      }
    });

    if (existingRecord) {
      return conversation;
    }

    // Add the tag

    const conversationTag = await db.conversationTags.upsert({
      where: {
        tagId_conversationId: {
          conversationId, tagId
        }
      },
      update: {},
      create: {
        conversationId,
        tagId
      }
    });

    // Touch the conversation

    await conversations.touchConversation(conversationId);

    return conversation;
  }

  const untagConversation = async (conversationId: number, tagId: number) => {
    const conversation = await conversations.getConversationById(conversationId);

    if (!conversation) throwNotFound();

    // Remove the tag

    const { count } = await db.conversationTags.deleteMany({
      where: {
        tagId,
        conversationId
      }
    });

    // Touch the conversation

    if (count === 1) {
      await conversations.touchConversation(conversationId);
    }

    return conversation;
  }

  return {
    tagConversation,
    untagConversation
  }
}

export type TagAbilties = ReturnType<typeof tagAbilities>
