import { Staff, ConversationType }                from "@prisma/client"
import { GoodChatPermissions }                    from "../typings/goodchat"
import _                                          from "lodash"
import { CollectionName }                         from "../db";

type Rules = Record<string, any>

// ----------------------------
//  Helpers
// ----------------------------

function conversationAbilities(staff: Staff) : Rules {
  
  function onlyIf<T>(perm: GoodChatPermissions, val: T) : T | undefined {
    return _.includes(staff.permissions, perm) ? val : void 0;
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
      onlyIf(GoodChatPermissions.CHAT_CUSTOMER, {
        type: ConversationType.CUSTOMER,
        customerId: {
          not: null
        }
      })
    ])
  };

  return rules;
}

// ----------------------------
//  Exposed methods
// ----------------------------

/**
 * Given a staff member and a table name, returns filter rules
 *
 * @export
 * @param {(Staff)} staff
 * @param {CollectionName} table
 * @returns {Rules}
 */
export function getAbilities(staff: Staff, table: CollectionName) : Rules {
  if (_.includes(staff.permissions, GoodChatPermissions.ADMIN)) {
    return {}; // no rules for admins;
  }
  
  switch (table) {
    // --- add rules here ---
    case "conversation":
      return conversationAbilities(staff)
  }

  return {};
}


