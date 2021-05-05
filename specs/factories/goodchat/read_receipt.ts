import { Factory }                                                  from 'fishery'
import _                                                            from 'lodash'
import db                                                           from '../../../lib/db'
import { AuthorType, ConversationType, ReadReceipt }                from '@prisma/client'
import { conversationFactory }                                      from './conversation'
import { staffFactory }                                             from './staff'
import { messageFactory }                                           from './message'
import { customerFactory }                                          from './customer'

/**
 * Creates a fake ReadReceipt record
 *
 * @type {Factory<Message>}
 * @exports
 */
export const readReceiptFactory = Factory.define<ReadReceipt>(({ sequence, onCreate }) => {
  onCreate(async (data) => {
    if (data.userType === AuthorType.STAFF && await db.staff.findUnique({ where: { id: data.userId }}) === null) {
      data.userId = (await staffFactory.create()).id;
    }
    if (data.userType === AuthorType.CUSTOMER && await db.customer.findUnique({ where: { id: data.userId }}) === null) {
      data.userId = (await customerFactory.create()).id;
    }
    if (data.conversationId && await db.conversation.findUnique({ where: { id: data.conversationId }}) === null) {
      data.conversationId = (await conversationFactory.create({
        type: ConversationType.PUBLIC
      })).id;
    }
    if (data.lastReadMessageId && await db.message.findUnique({ where: { id: data.lastReadMessageId }}) === null) {
      data.lastReadMessageId = (await messageFactory.create({ conversationId: data.conversationId })).id;
    }
    return db.readReceipt.create({
      data: _.omit(data, 'id')
    })
  });

  const date = new Date();

  return {
    id: sequence,
    createdAt: date,
    updatedAt: date,
    conversationId: conversationFactory.build().id,
    userId: staffFactory.build().id,
    userType: AuthorType.STAFF,
    lastReadMessageId: messageFactory.build().id
  }
});
