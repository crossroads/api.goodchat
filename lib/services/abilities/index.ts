import { Staff }                 from '@prisma/client'
import { conversationAbilities } from "./conversation_abilities"
import { messageAbilities }      from "./message_abilities"
import { customerAbilities }     from "./customer_abilities"

export * from './helpers'
export * from './conversation_abilities'
export * from './message_abilities'
export * from './customer_abilities'

/**
 * Creates a set of secure methods for a certain staff member, which automatically applies any
 * security rules to the db request
 *
 * @export
 * @param {Staff} staff
 */
 export function abilities(staff: Staff) {
  return {
    ...conversationAbilities(staff),
    ...messageAbilities(staff),
    ...customerAbilities(staff)
  }
 }

 export type Abilities = ReturnType<typeof abilities>
