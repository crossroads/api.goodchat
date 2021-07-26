import { Conversation }  from '@prisma/client'
import * as factories    from '../factories'
import { expect }        from 'chai'
import db                from '../../lib/db'
import _                 from 'lodash'
import {
  createGoodchatServer,
} from '../spec_helpers/agent'

describe('Lifecycle events', () => {
  before(async () => { await createGoodchatServer(); })

  context('When a message is created', () => {
    let conversation : Conversation

    beforeEach(async () => {
      conversation = await factories.conversationFactory.create({})
    })

    it('touches the conversation', async () => {
      await factories.messageFactory.create({ conversationId: conversation.id })

      const updatedConversation = await db.conversation.findFirst({
        where: { id: conversation.id }
      })

      expect(
        updatedConversation.updatedAt.getTime()
      ).to.be.greaterThan(conversation.updatedAt.getTime())
    })
  })
})
