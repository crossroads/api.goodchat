import { Factory }                               from 'fishery'
import _                                         from 'lodash'
import * as factories                            from '..'
import { Conversation, ConversationType, Staff } from '@prisma/client';
import db                                        from '../../../lib/db'
import { map }                                   from '../../../lib/utils/async';

interface ConversationFactoryParams {
  members?: Staff[],
  tags?: string[]
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

    // UPSERT TAGS
    const tags = await map(transientParams.tags || [], (name) => (
      factories.tagFactory.create({ name })
    ))

    // CREATE CUSTOMER
    if (data.customerId && await db.customer.findUnique({ where: { id: data.customerId }}) === null) {
      data.customerId = (await factories.customerFactory.create()).id;
    }

    // CREATE CONVERSATION
    const conversation = await db.conversation.create({
      data: {
        ..._.omit(data, 'id'),
        tags: {
          createMany: {
            data: tags.map(({id}) => ({ tagId: id }))
          }
        }
      }
    });

    // ADD MEMBERS TO CONVERSATION
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
      data.sunshineConversationId = null;
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
    type: ConversationType.CUSTOMER,
    metadata: {}
  }
})
