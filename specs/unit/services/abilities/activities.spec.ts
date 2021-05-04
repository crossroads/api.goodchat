import { activities }                                                   from '../../../../lib/services/abilities'
import * as factories                                                   from '../../../factories'
import { expect }                                                       from 'chai'
import _                                                                from 'lodash'
import { AuthorType, Conversation, ConversationType, Message, Staff }   from '@prisma/client'
import { GoodChatPermissions }                                          from '../../../../lib/typings/goodchat'
import { ActivitiesApi, MessagesApi }                                   from 'sunshine-conversations-client'
import sinon                                                            from 'sinon'
import config                                                           from '../../../../lib/config'
import db                                                               from '../../../../lib/db'

describe('Services/abilities/activities', () => {
  let user : Staff
  let conversation : Conversation
  let messages : Message[]
  let sunshineActivityStub : sinon.SinonStub

  beforeEach(async () => {
    const now = Date.now();

    sunshineActivityStub = sinon.stub(ActivitiesApi.prototype, 'postActivity');
    user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    conversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });
    messages = [
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000) }),
      await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000) })
    ]
  });

  afterEach(() => sunshineActivityStub.restore())

  describe('Typing on/off', () => {

    it('sends the start typing event to sunshine', async () => {
      await activities(user).startTyping(conversation.id);

      expect(sunshineActivityStub.callCount).to.eq(1);
      expect(sunshineActivityStub.getCall(0).args).to.deep.eq([
        config.smoochAppId,
        conversation.sunshineConversationId,
        {
          author: {
            type: "business"
          },
          type: "typing:start"
        }
      ]);
    })

    it('sends the stop typing event to sunshine', async () => {
      await activities(user).stopTyping(conversation.id);

      expect(sunshineActivityStub.callCount).to.eq(1);
      expect(sunshineActivityStub.getCall(0).args).to.deep.eq([
        config.smoochAppId,
        conversation.sunshineConversationId,
        {
          author: {
            type: "business"
          },
          type: "typing:stop"
        }
      ]);
    })
  })

  describe('Marking a conversation as read', () => {

    it('sends the conversation read event to sunshine', async () => {
      await activities(user).markAsRead(conversation.id);

      expect(sunshineActivityStub.callCount).to.eq(1);
      expect(sunshineActivityStub.getCall(0).args).to.deep.eq([
        config.smoochAppId,
        conversation.sunshineConversationId,
        {
          author: {
            type: "business"
          },
          type: "conversation:read"
        }
      ]);
    })

    it('creates a read receipt to the last message if it doesnt exist', async () => {
      expect(await db.readReceipt.count()).to.eq(0);

      await activities(user).markAsRead(conversation.id);

      expect(await db.readReceipt.count()).to.eq(1);

      const receipt = await db.readReceipt.findFirst();

      expect(receipt.userId).to.eq(user.id)
      expect(receipt.conversationId).to.eq(conversation.id)
      expect(receipt.lastReadMessageId).to.eq(messages[2].id)
    })

    it('updates a read receipt to the last message if it already exist', async () => {
      await factories.readReceiptFactory.create({
        conversationId: conversation.id,
        userId: user.id,
        userType: AuthorType.STAFF,
        lastReadMessageId: messages[0].id
      })

      expect(await db.readReceipt.count()).to.eq(1);

      await activities(user).markAsRead(conversation.id);

      expect(await db.readReceipt.count()).to.eq(1);

      const receipt = await db.readReceipt.findFirst();

      expect(receipt.userId).to.eq(user.id)
      expect(receipt.conversationId).to.eq(conversation.id)
      expect(receipt.lastReadMessageId).to.eq(messages[2].id)
    })
  })
});
