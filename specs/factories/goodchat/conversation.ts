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
      await factories.customerFactory.create({ id: data.customerId });
    }
    return db.conversation.create({ data })
  })

  return {
    id: sequence,
    createdAt: new Date(),
    updatedAt: new Date(),
    sunshineConversationId:factories.sunshineConversationFactory.build().id,
    customerId: factories.customerFactory.build().id,
    source: 'whatsapp',
    readByCustomer: true,
    private: false,
    metadata: {}
  }
})
