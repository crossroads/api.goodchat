import { abilities }                                       from '../../../../lib/services/abilities'
import * as factories                                      from '../../../factories'
import { expect }                                          from 'chai'
import _                                                   from 'lodash'
import { Conversation, ConversationType, Message, Staff }  from '@prisma/client'
import { GoodChatPermissions }                             from '../../../../lib/typings/goodchat'
import { GoodchatError }                                   from '../../../../lib/utils/errors'
import { MessagesApi }                                     from 'sunshine-conversations-client'
import { each }                                            from '../../../../lib/utils/async'
import config                                              from '../../../../lib/config'
import sinon                                               from 'sinon'
import db                                                  from '../../../../lib/db'
import timekeeper                                          from 'timekeeper'

const membersOf = async (conversationId: number) : Promise<number[]> => {
  const records = await db.staffConversations.findMany({
    where: { conversationId }
  });
  return _.map(records, 'staffId');
}

const ids = (records: any[]) => _.map(records, 'id')

describe('Services/Abilities/Messages', () => {
  let admin                 : Staff
  let customerStaff         : Staff
  let baseStaff             : Staff
  let customerChat          : Conversation
  let privateChat           : Conversation
  let publicChat            : Conversation
  let customerChatMessages  : Message[]
  let privateChatMessages   : Message[]
  let publicChatMessages    : Message[]

  beforeEach(async () => {
    // Create 3 users, one for each permission
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] });
    baseStaff = await factories.staffFactory.create({ permissions: [] });

    // Populate the database with some conversations
    customerChat = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
    publicChat   = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
    privateChat  = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
    customerChatMessages = await factories.messageFactory.createList(2, { conversationId: customerChat.id })
    privateChatMessages = await factories.messageFactory.createList(2, { conversationId: privateChat.id })
    publicChatMessages = await factories.messageFactory.createList(2, { conversationId: publicChat.id })
  });

  afterEach(() => {
    timekeeper.reset();
  })

  describe("#getMessages", () => {

    context('As an admin', () => {
      it('allows me to read messages from customer chats', async () => {
        const messages = await abilities(admin).getMessages({ conversationId: customerChat.id });
        expect(ids(messages)).to.have.deep.members(ids(customerChatMessages));
      })

      it('allows me to read messages from public chats', async () => {
        const messages = await abilities(admin).getMessages({ conversationId: publicChat.id });

        expect(messages.length).to.eq(2);
        expect(_.uniq(_.map(messages, 'conversationId'))).to.deep.eq([publicChat.id])
      })

      it('does not allow me to view messages from private chats I am not a member of', async () => {
        const messages = await abilities(admin).getMessages({ conversationId: privateChat.id });
        expect(messages.length).to.eq(0);
      })

      it('allows me to view private messages from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [admin] } }
        )

        const myMessages = await factories.messageFactory.createList(2, { conversationId: myPrivateChat.id })

        const messages = await abilities(admin).getMessages({ conversationId: myPrivateChat.id });

        expect(
          _.map(messages, 'id')
        ).to.have.deep.members(_.map(myMessages, 'id'));
      })
    })

    context('As an staff member with Customer permissions', () => {
      it('allows me to read messages from customer chats', async () => {
        const messages = await abilities(customerStaff).getMessages({ conversationId: customerChat.id });

        expect(messages.length).to.eq(2);
        expect(_.uniq(_.map(messages, 'conversationId'))).to.deep.eq([customerChat.id])
      })

      it('allows me to read messages from public chats', async () => {
        const messages = await abilities(customerStaff).getMessages({ conversationId: publicChat.id });

        expect(messages.length).to.eq(2);
        expect(_.uniq(_.map(messages, 'conversationId'))).to.deep.eq([publicChat.id])
      })

      it('does not allow me to view messages from private chats I am not a member of', async () => {
        const messages = await abilities(customerStaff).getMessages({ conversationId: privateChat.id });
        expect(messages.length).to.eq(0);
      })

      it('allows me to view private messages from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [customerStaff] } }
        )

        const myMessages = await factories.messageFactory.createList(2, { conversationId: myPrivateChat.id })

        const messages = await abilities(customerStaff).getMessages({ conversationId: myPrivateChat.id });

        expect(
          _.map(messages, 'id')
        ).to.have.deep.members(_.map(myMessages, 'id'));
      })
    })

    context('As an staff member with no permissions', () => {
      it('does not allow me me to read messages from customer chats', async () => {
        const messages = await abilities(baseStaff).getMessages({ conversationId: customerChat.id });
        expect(messages.length).to.eq(0);
      })

      it('allows me to read messages from public chats', async () => {
        const messages = await abilities(baseStaff).getMessages({ conversationId: publicChat.id });

        expect(messages.length).to.eq(2);
        expect(_.uniq(_.map(messages, 'conversationId'))).to.deep.eq([publicChat.id])
      })

      it('does not allow me to view messages from private chats I am not a member of', async () => {
        const messages = await abilities(baseStaff).getMessages({ conversationId: privateChat.id });
        expect(messages.length).to.eq(0);
      })

      it('allows me to view private messages from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff] } }
        )

        const myMessages = await factories.messageFactory.createList(2, { conversationId: myPrivateChat.id })

        const messages = await abilities(baseStaff).getMessages({ conversationId: myPrivateChat.id });

        expect(
          _.map(messages, 'id')
        ).to.have.deep.members(_.map(myMessages, 'id'));
      })
    })

    describe('Paginating messages with limit and after', () => {
      let orderedMessages : Message[]

      beforeEach(async () => {
        await each(_.range(10), async (i) => {
          timekeeper.travel(new Date(Date.now() - i * 60000))

          await factories.messageFactory.create({
            conversationId: publicChat.id
          })
        });

        orderedMessages = await db.message.findMany({
          where: {
            conversationId: publicChat.id
          },
          orderBy: [
            { createdAt: 'desc' }
          ]
        })
      })

      it('returns the first page of the specified limit size', async () => {
        const firstPage = await abilities(admin).getMessages({
          conversationId: publicChat.id,
          limit: 4
        })

        expect(firstPage).to.have.lengthOf(4);
        expect(firstPage).to.deep.eq(
          orderedMessages.slice(0, 4)
        )
      })

      it('returns the second page using an after cursor', async () => {
        const secondPage = await abilities(admin).getMessages({
          conversationId: publicChat.id,
          limit: 4,
          after: orderedMessages[3].id
        })

        expect(secondPage).to.have.lengthOf(4);
        expect(secondPage).to.deep.eq(
          orderedMessages.slice(4, 8)
        )
      })
    })
  })

  describe("#getMessageById", () => {
    context('As an admin', () => {
      it('allows me to read one message by Id from customer chats', async () => {
        const message = await abilities(admin).getMessageById(customerChatMessages[0].id);
        expect(message).to.deep.eq(customerChatMessages[0]);
      })

      it('allows me to read one message by Id from public chats', async () => {
        const message = await abilities(admin).getMessageById(publicChatMessages[0].id);
        expect(message).to.deep.eq(publicChatMessages[0]);
      })

      it('does not allow me to read one message by Id from private chats I am not a member of', async () => {
        const message = await abilities(admin).getMessageById(privateChatMessages[0].id);
        expect(message).to.deep.eq(null)
      })

      it('allows me to read one message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [admin] } }
        )

        const expectedMessage = await factories.messageFactory.create({ conversationId: myPrivateChat.id })

        const message = await abilities(admin).getMessageById(expectedMessage.id);

        expect(message).to.deep.eq(expectedMessage);
      })
    })

    context('As a customer staff', () => {
      it('allows me to read one message by Id from customer chats', async () => {
        const message = await abilities(customerStaff).getMessageById(customerChatMessages[0].id);
        expect(message).to.deep.eq(customerChatMessages[0]);
      })

      it('allows me to read one message by Id from public chats', async () => {
        const message = await abilities(customerStaff).getMessageById(publicChatMessages[0].id);
        expect(message).to.deep.eq(publicChatMessages[0]);
      })

      it('does not allow me to read one message by Id from private chats I am not a member of', async () => {
        const message = await abilities(customerStaff).getMessageById(privateChatMessages[0].id);
        expect(message).to.deep.eq(null)
      })

      it('allows me to read one message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [customerStaff] } }
        )

        const expectedMessage = await factories.messageFactory.create({ conversationId: myPrivateChat.id })

        const message = await abilities(customerStaff).getMessageById(expectedMessage.id);

        expect(message).to.deep.eq(expectedMessage);
      })
    })

    context('As a staff with no permissions', () => {
      it('does not allow me to read one message from customer chats', async () => {
        const message = await abilities(baseStaff).getMessageById(customerChatMessages[0].id);
        expect(message).to.be.null
      })

      it('allows me to read one message by Id from public chats', async () => {
        const message = await abilities(baseStaff).getMessageById(publicChatMessages[0].id);
        expect(message).to.deep.eq(publicChatMessages[0]);
      })

      it('does not allow me to read one message by Id from private chats I am not a member of', async () => {
        const message = await abilities(baseStaff).getMessageById(privateChatMessages[0].id);
        expect(message).to.deep.eq(null)
      })

      it('allows me to read one message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff] } }
        )

        const expectedMessage = await factories.messageFactory.create({ conversationId: myPrivateChat.id })

        const message = await abilities(baseStaff).getMessageById(expectedMessage.id);

        expect(message).to.deep.eq(expectedMessage);
      })
    })
  })

  describe('#sendMessage', () => {
    let postMessageStub : sinon.SinonStub

    beforeEach(() => {
      postMessageStub = sinon.stub(MessagesApi.prototype, 'postMessage').returns(Promise.resolve({
        messages: [
          factories.sunshineMessageFactory.build({ id: 'aSunshineId' })
        ]
      }))
    })

    afterEach(() => postMessageStub.restore())

    describe('Forward to Sunshine Conversations', () => {
      let whatsappConversation : Conversation
      let localConversation : Conversation

      beforeEach(async () => {
        whatsappConversation  = await factories.conversationFactory.create({type: ConversationType.CUSTOMER })
        localConversation  = await factories.conversationFactory.create({type: ConversationType.PUBLIC })
      })

      context('for a customer conversation', () => {
        it('pushes the message to sunshine conversation', async () => {
          expect(postMessageStub.callCount).to.eq(0);
          const message = await abilities(admin).sendMessage(whatsappConversation.id, {
            type: 'text',
            text: 'Hi'
          });
          expect(postMessageStub.callCount).to.eq(1);
          expect(postMessageStub.getCall(0).args).to.deep.eq([
            config.smoochAppId,
            whatsappConversation.sunshineConversationId,
            {
              author: {
                displayName: "GoodChat",
                type: "business"
              },
              content: {
                type: 'text',
                text: 'Hi'
              }
            }
          ]);
          expect(message.sunshineMessageId).to.eq('aSunshineId');
        })
      })

      context('for a local conversation', () => {
        it('does not push the message to sunshine conversation', async () => {
          expect(postMessageStub.callCount).to.eq(0);
          await abilities(admin).sendMessage(localConversation.id, {
            type: 'text',
            text: 'Hi'
          });
          expect(postMessageStub.callCount).to.eq(0);
        })
      })
    });

    describe('Auto-joining a conversation', () => {
      it('automatically adds me to a conversation when sending a message', async () => {
        expect(await membersOf(customerChat.id)).not.to.include(admin.id)

        const message = await abilities(admin).sendMessage(customerChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(customerChat.id);
        expect(await membersOf(customerChat.id)).to.include(admin.id)
      })
    })

    context('As an admin', () => {
      it('allows me to send a message to a customer chat', async () => {
        const message = await abilities(admin).sendMessage(customerChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(customerChat.id);
      })

      it('allows me to send one message to a public chat', async () => {
        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(publicChat.id);
      })

      it('does not allow me to send a message to private chats I am not a member of', async () => {
        await expect(
          abilities(admin).sendMessage(privateChat.id, {
            type: 'text',
            text: 'Hi'
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
      })

      it('allows me to send a message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [admin] } }
        )

        const message = await abilities(admin).sendMessage(myPrivateChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(myPrivateChat.id);
      })
    })

    context('As a customer staff', () => {
      it('allows me to send a message to a customer chat', async () => {
        const message = await abilities(customerStaff).sendMessage(customerChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(customerChat.id);
      })

      it('allows me to send one message to a public chat', async () => {
        const message = await abilities(customerStaff).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(publicChat.id);
      })

      it('does not allow me to send a message to private chats I am not a member of', async () => {
        await expect(
          abilities(customerStaff).sendMessage(privateChat.id, {
            type: 'text',
            text: 'Hi'
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
      })

      it('allows me to send a message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [customerStaff] } }
        )

        const message = await abilities(customerStaff).sendMessage(myPrivateChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(myPrivateChat.id);
      })
    })

    context('As a staff with no permissions', () => {
      it('does not allow me to send a message to a customer chat', async () => {
        await expect(
          abilities(baseStaff).sendMessage(customerChat.id, {
            type: 'text',
            text: 'Hi'
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
      })

      it('allows me to send one message to a public chat', async () => {
        const message = await abilities(baseStaff).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(publicChat.id);
      })

      it('does not allow me to send a message to private chats I am not a member of', async () => {
        await expect(
          abilities(baseStaff).sendMessage(privateChat.id, {
            type: 'text',
            text: 'Hi'
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
      })

      it('allows me to send a message by Id from a chat I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff] } }
        )

        const message = await abilities(baseStaff).sendMessage(myPrivateChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).not.to.be.null
        expect(message.conversationId).to.deep.eq(myPrivateChat.id);
      })
    })
  })
});
