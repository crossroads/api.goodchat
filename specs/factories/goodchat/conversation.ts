import { Factory }                               from 'fishery'
import _                                         from 'lodash'
import * as factories                            from '..'
import { Conversation, ConversationType, Staff } from '@prisma/client';
import db                                        from '../../../lib/db'

interface ConversationFactoryParams {
  members?: Staff[]
}

/**
 * Creates a fake Conversation record
 * 
 * @type {Factory<Conversation>}
 * @exports
 */
export const conversationFactory = Factory.define<Conversation, ConversationFactoryParams>(({
  sequence,
  onCreate,
  afterBuild,
  transientParams
}) => {

  onCreate(async (data) => {
    if (data.customerId && await db.customer.findUnique({ where: { id: data.customerId }}) === null) {
      data.customerId = (await factories.customerFactory.create()).id;
    }
    const conversation = await db.conversation.create({ data: _.omit(data, 'id') })

    const members = transientParams.members || [];

    for (const staff of members) {
      await db.staffConversations.create({
        data: {
          staffId: staff.id,
          conversationId: conversation.id
        }
      })
    }

    return conversation;
  })

  afterBuild((data) => {
    if (data.type !== ConversationType.CUSTOMER) {
      data.customerId = null;
    }
  });

  const now = new Date();

  return {
    id: sequence,
    createdAt: now,
    updatedAt: now,
    sunshineConversationId: _.uniqueId(),
    customerId: factories.customerFactory.build().id,
    source: 'whatsapp',
    readByCustomer: true,
    type: ConversationType.CUSTOMER,
    metadata: {}
  }
})
