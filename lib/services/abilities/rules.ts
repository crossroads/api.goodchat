import { Staff, ConversationType }                from "@prisma/client"
import { GoodChatPermissions }                    from "../../typings/goodchat"
import _                                          from "lodash"
import { CollectionName }                         from "../../db";

type Rules = Record<string, any>


/**
 * Returns a where clause that filters conversations based on the user
 *
 * @export
 * @param {Staff} staff
 * @returns {Rules}
 */
export function getConversationRules(staff: Staff) : Rules {
  
  function onlyIf<T>(perms: GoodChatPermissions[], val: T) : T | undefined {
    return _.find(perms, (p) => _.includes(staff.permissions, p)) ? val : void 0;
  }

  const rules = {
    OR: _.compact([
      // User can access his/her own private conversations
      {
        type: ConversationType.PRIVATE,
        staffConversations: {
          some: {
            staffId: staff.id
          }
        }
      },
      // User can access non-customer public conversations
      {
        type: ConversationType.PUBLIC,
        customerId: null
      },
      // User can talk to public customers chats with the correct permissions
      onlyIf([
        GoodChatPermissions.CHAT_CUSTOMER,
        GoodChatPermissions.ADMIN
      ], {
        type: ConversationType.CUSTOMER,
        customerId: {
          not: null
        }
      })
    ])
  };

  return rules;
}

