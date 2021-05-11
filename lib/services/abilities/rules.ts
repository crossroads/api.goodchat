import { Staff, ConversationType }                from "@prisma/client"
import { GoodChatPermissions }                    from "../../typings/goodchat"
import _                                          from "lodash"

type Rules = Record<string, any>

/**
 * Returns a where clause that filters conversations based on the user
 *
 * @export
 * @param {Staff} staff
 * @returns {Rules}
 */
export function getConversationRules(staff: Staff) : Rules {

  function onlyIf<T>(cond: boolean, val: T) : T | undefined {
    return cond ? val : void 0;
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
      onlyIf(canViewCustomers(staff), {
        type: ConversationType.CUSTOMER,
        customerId: {
          not: null
        }
      })
    ])
  };

  return rules;
}

/**
 * For a given user, returns the types of conversation the user can be a part of
 *
 * @export
 * @param {Staff} staff
 * @returns {ConversationType[]}
 */
export function allowedConversationTypes(staff: Staff) : ConversationType[] {
  const types : ConversationType[] = [
    ConversationType.PUBLIC,
    ConversationType.PRIVATE
  ];

  if (canViewCustomers(staff)) {
    types.push(ConversationType.CUSTOMER);
  }

  return types;
}

/**
 * Returns true if a staff member has access to customers
 *
 * @export
 * @param {Staff} staff
 * @returns {boolean}
 */
export function canViewCustomers(staff: Staff) : boolean {
  const has = (perm: GoodChatPermissions) => _.includes(staff.permissions, perm);
  return has(GoodChatPermissions.CHAT_CUSTOMER) || has(GoodChatPermissions.ADMIN);
}
