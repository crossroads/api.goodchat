import { Factory }                    from 'fishery'
import _                              from 'lodash'
import db                             from '../../../lib/db'
import { AuthorType, Message }        from '@prisma/client'
import { conversationFactory }        from './conversation'

/**
 * Creates a fake Message record
 *
 * @type {Factory<Message>}
 * @exports
 */
export const messageFactory = Factory.define<Message>(({ sequence, onCreate }) => {
  onCreate(async (data) => {
    if (data.conversationId && await db.conversation.findUnique({ where: { id: data.conversationId }}) === null) {
      data.conversationId = (await conversationFactory.create()).id;
    }
    return db.message.create({
      data: _.omit(data, 'id')
    })
  });

  const date = new Date();

  return {
    id: sequence,
    createdAt: date,
    updatedAt: date,
    conversationId: conversationFactory.build().id,
    sunshineMessageId: String(sequence),
    authorType: AuthorType.SYSTEM,
    authorId: 0,
    content: {"text":"hello", "type":"text" },
    metadata: {}
  }
});
