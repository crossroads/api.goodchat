import { GoodChatPermissions }   from '../../../lib/typings/goodchat'
import * as factories            from '../../factories'
import * as computer             from '../../../lib/services/computer'
import { expect }                from 'chai'
import _                         from 'lodash'
import {
  AuthorType,
  Conversation,
  ConversationType,
  Message,
  Staff
} from '@prisma/client'


describe('Services/computer', () => {
  let user : Staff
  let conversation : Conversation
  let messages : Message[]

  beforeEach(async () => {
    const now = Date.now();

    user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    conversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });
    messages = [
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 4000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 5000) })
    ]
  });

  describe('Computing the total message count', () => {

    it('returns the count of all messages', async () => {
      expect(messages.length).to.eq(5)
      expect(
        await computer.computeMessageCount(conversation.id)
      ).to.eq(5)
    })
  })

  describe('Computing the unread message count', () => {

    context('of as single conversation', () => {

      context('when no read receipt exists', () => {

        it('returns the count of all messages', async () => {
          expect(messages.length).to.eq(5)
          expect(
            await computer.computeUnreadMessageCount(user.id, conversation.id)
          ).to.eq(5)
        })
      })

      context('when a read receipt exists', () => {

        beforeEach(async () => {
          await factories.readReceiptFactory.create({
            conversationId: conversation.id,
            userId: user.id,
            userType: AuthorType.STAFF,
            lastReadMessageId: messages[1].id // second message is read
          })
        })

        it('returns the count of messages AFTER the last read message', async () => {
          expect(messages.length).to.eq(5)
          expect(
            await computer.computeUnreadMessageCount(user.id, conversation.id)
          ).to.eq(3)
        })
      })
    });
  })
});
