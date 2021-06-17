import { Conversation, ConversationType, Message, Staff }  from '@prisma/client'
import { GoodChatPermissions }                             from '../../../../lib/typings/goodchat'
import { GoodchatError }                                   from '../../../../lib/utils/errors'
import messageJob                                          from '../../../../lib/jobs/message.job'
import { MessagesApi }                                     from 'sunshine-conversations-client'
import * as factories                                      from '../../../factories'
import { abilities }                                       from '../../../../lib/services/abilities'
import timekeeper                                          from 'timekeeper'
import { map }                                             from '../../../../lib/utils/async'
import config                                              from '../../../../lib/config'
import sinon                                               from 'sinon'
import db                                                  from '../../../../lib/db'
import { expect }                                          from 'chai'
import _                                                   from 'lodash'

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
      let chat : Conversation

      beforeEach(async () => {
        chat =  await factories.conversationFactory.create({ type: ConversationType.PUBLIC })

        orderedMessages = await map(_.range(10), (i) => {
          timekeeper.travel(new Date(Date.now() - i * 60000))

          return factories.messageFactory.create({
            conversationId: chat.id
          })
        });
      })

      it('returns the first page of the specified limit size', async () => {
        const firstPage = await abilities(admin).getMessages({
          conversationId: chat.id,
          limit: 4
        })

        expect(firstPage).to.have.lengthOf(4);
        expect(firstPage).to.deep.eq(
          orderedMessages.slice(0, 4)
        )
      })

      it('returns the second page using an after cursor', async () => {
        const secondPage = await abilities(admin).getMessages({
          conversationId: chat.id,
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

      const waitForQueue = async () => {
        const completionCb = sinon.stub();
        const failureCb = sinon.stub();

        await new Promise(done => {
          messageJob.worker.on('completed', () => { completionCb(); done(true) })
          messageJob.worker.on('failed', () => { failureCb(); done(false) })
        })

        expect(completionCb.callCount).to.eq(1)
        expect(failureCb.callCount).to.eq(0)
      }

      beforeEach(async () => {
        whatsappConversation  = await factories.conversationFactory.create({type: ConversationType.CUSTOMER })
        localConversation  = await factories.conversationFactory.create({type: ConversationType.PUBLIC })
      })

      context('for a customer conversation', () => {
        it('queues up the message for customer delivery', async () => {
          expect(postMessageStub.callCount).to.eq(0);

          const queueFinished = waitForQueue();

          const message = await abilities(admin).sendMessage(whatsappConversation.id, {
            type: 'text',
            text: 'Hi'
          });

          await queueFinished;

          expect(await messageJob.queue.getCompletedCount()).to.eq(1)

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

          const updatedMessage = await db.message.findUnique({
            where: { id: message.id }
          })
          expect(updatedMessage.sunshineMessageId).to.eq('aSunshineId');
        })
      })

      context('for a local conversation', () => {
        it('does not push the message to sunshine conversation', async () => {
          expect(postMessageStub.callCount).to.eq(0);

          await abilities(admin).sendMessage(localConversation.id, {
            type: 'text',
            text: 'Hi'
          });

          expect(await messageJob.queue.count()).to.eq(0)

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

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(customerChat.id);
        expect(await membersOf(customerChat.id)).to.include(admin.id)
      })
    })

    describe('Setting message metadata', () => {
      it('sets the metadata field of the created record', async () => {
        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        }, {
          metadata: { some: 'data' }
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(publicChat.id);
        expect(message.metadata).to.deep.eq({ some: 'data' });
      })
    })

    describe('Setting the user timestamp', () => {
      const second = (n = 1) => n * 1000;
      const minute = (n = 1) => n * second(60);
      const travel = (ms : number) => Date.now() + ms

      it('sets the createdAt field to the specified timestamp', async () => {
        const timestamp = travel(minute(-3));

        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        }, {
          timestamp: timestamp
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(publicChat.id);
        expect(message.createdAt.getTime()).to.eq(timestamp);
        expect(message.updatedAt.getTime()).to.eq(timestamp);
      })

      it('allows setting a timestamp up to an hour ago', async () => {
        const timestamp = travel(minute(-59));

        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        }, {
          timestamp: timestamp
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(publicChat.id);
        expect(message.createdAt.getTime()).to.eq(timestamp);
        expect(message.updatedAt.getTime()).to.eq(timestamp);
      })

      it('allows setting a timestamp up to 10 minutes from now', async () => {
        const timestamp = travel(minute(9));

        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        }, {
          timestamp: timestamp
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(publicChat.id);
        expect(message.createdAt.getTime()).to.eq(timestamp);
        expect(message.updatedAt.getTime()).to.eq(timestamp);
      })

      it('fails to set a timestamp older than an hour ago', async () => {
        const timestamp = travel(minute(-61));

        await expect(
          abilities(admin).sendMessage(publicChat.id, {
            type: 'text',
            text: 'Hi'
          }, {
            timestamp: timestamp
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.invalid_timestamp')
      })

      it('fails to set a timestamp beyong 10 minutes from now', async () => {
        const timestamp = travel(minute(11))

        await expect(
          abilities(admin).sendMessage(publicChat.id, {
            type: 'text',
            text: 'Hi'
          }, {
            timestamp: timestamp
          })
        ).to.be.rejectedWith(GoodchatError, 'errors.invalid_timestamp')
      })
    })

    context('As an admin', () => {
      it('allows me to send a message to a customer chat', async () => {
        const message = await abilities(admin).sendMessage(customerChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(customerChat.id);
      })

      it('allows me to send one message to a public chat', async () => {
        const message = await abilities(admin).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).to.exist
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

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(myPrivateChat.id);
      })
    })

    context('As a customer staff', () => {
      it('allows me to send a message to a customer chat', async () => {
        const message = await abilities(customerStaff).sendMessage(customerChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(customerChat.id);
      })

      it('allows me to send one message to a public chat', async () => {
        const message = await abilities(customerStaff).sendMessage(publicChat.id, {
          type: 'text',
          text: 'Hi'
        });

        expect(message).to.exist
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

        expect(message).to.exist
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

        expect(message).to.exist
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

        expect(message).to.exist
        expect(message.conversationId).to.deep.eq(myPrivateChat.id);
      })
    })
  })
});
