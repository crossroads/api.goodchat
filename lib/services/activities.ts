import { AuthorType, Conversation, ReadReceipt, Staff }  from "@prisma/client"
import { throwForbidden }                                from "../utils/errors"
import { ActivitiesApi }                                 from "sunshine-conversations-client"
import { abilities }                                     from "./abilities"
import config                                            from "../config"
import { sql }                                           from "../db"
import { isFreshRecord, pubsub }                         from "./events"

const transformToPrismaDAO = (obj: any): ReadReceipt => {
  return {
    ...obj,
    createdAt: new Date(obj.createdAt),
    updatedAt: new Date(obj.updatedAt)
  }
}

/**
 * this atomic query upserts ReadReceipt with the latest message of a conversation
 * 
 * If there are no messages for a particular conversationId, 
 * the insert clause would simply insert nothing
 */
async function createOrUpdateReadReceipt(
  conversationId: number, 
  staffId: number, 
  authorType: string
): Promise<ReadReceipt|null> {
  const result = await sql`
    insert into "ReadReceipt" ("userId", "userType", "conversationId", "lastReadMessageId", "updatedAt") 
    select ${staffId}, ${authorType}, ${conversationId}, "Message"."id", now()
    from "Message"
    where "conversationId" = ${conversationId} 
    order by "createdAt" desc 
    limit 1
    on conflict ("userId", "userType", "conversationId") 
    do 
      update
      set "lastReadMessageId" = (
        select "Message".id 
        from "Message"
        where "Message"."conversationId" = ${conversationId}
        order by "createdAt" desc 
        limit 1
        ),
        "updatedAt" = now() 
    returning *
  `
  
  if(result.length !== 0) {
    const readReceiptObj = transformToPrismaDAO(result[0])
    await pubsub.publish('read_receipt', {
      ['readReceipt']: readReceiptObj,
      action: isFreshRecord(readReceiptObj) ? 'create' : 'update'
    })
  }
    
  return result[0]
}


export function activities(staff: Staff) {

  const crud = abilities(staff);
  const sunshineActivities = new ActivitiesApi();

  // --- Helpers

  const triggerSunshineActivity = (sunshineConversationId: string, type: string) => {
    return sunshineActivities.postActivity(config.smoochAppId, sunshineConversationId, {
      "author": {
        "type": "business"
      },
      "type": type
    });
  }

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

    return createOrUpdateReadReceipt(conversationId, staff.id, AuthorType.STAFF)
  }

  return {
    startTyping,
    stopTyping,
    markAsRead
  }
}

export type Activities = ReturnType<typeof activities>
