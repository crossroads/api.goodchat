import { Factory }      from 'fishery'
import _                from 'lodash'
import * as factories   from '..'
import { Conversation } from '@prisma/client';
import db               from '../../../lib/db'

/**
 * Creates a fake Conversation record
 * 
 * @type {Factory<Conversation>}
 * @exports
 */
export const conversationFactory = Factory.define<Conversation>(({ sequence, onCreate }) => {

  onCreate(async (data) => {
    if (data.customerId && await db.customer.findUnique({ where: { id: data.customerId }}) === null) {
      data.customerId = (await factories.customerFactory.create()).id;
    }
    return db.conversation.create({ data: _.omit(data, 'id') })
  })

  const now = new Date();

  return {
    id: sequence,
    createdAt: now,
    updatedAt: now,
    sunshineConversationId: _.uniqueId(),
    customerId: factories.customerFactory.build().id,
    source: 'whatsapp',
    readByCustomer: true,
    private: false,
    metadata: {}
  }
})
