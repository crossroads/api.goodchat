import { abilities }                                       from '../../../lib/services/abilities'
import * as factories                                      from '../../factories'
import { expect }                                          from 'chai'
import _                                                   from 'lodash'
import { Conversation, ConversationType, Message, Staff }  from '@prisma/client'
import { GoodChatPermissions }                             from '../../../lib/typings/goodchat'
import { GoodchatError }                                   from '../../../lib/utils/errors'
import { MessagesApi }                                     from 'sunshine-conversations-client'
import sinon                                               from 'sinon'
import { BLANK_CONFIG }                                    from '../../samples/config'
import db                                                  from '../../../lib/db'

const membersOf = async (conversationId: number) : Promise<number[]> => {
  const records = await db.staffConversations.findMany({
    where: { conversationId }
  });
  return _.map(records, 'staffId');
}

describe('Services/abilities', () => {
  let admin         : Staff
  let customerStaff : Staff
  let baseStaff     : Staff

  beforeEach(async () => {
    // Create 3 users, one for each permission
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] });
    baseStaff = await factories.staffFactory.create({ permissions: [] });
  });

  describe('Conversation abilities', () => {
    let customerChats : Conversation[]
    let privateChats  : Conversation[]
    let publicChats   : Conversation[]

    beforeEach(async () => {
      // Populate the database with some conversations
      customerChats = await factories.conversationFactory.createList(5, { type: ConversationType.CUSTOMER })
      publicChats   = await factories.conversationFactory.createList(4, { type: ConversationType.PUBLIC })
      privateChats  = await factories.conversationFactory.createList(3, { type: ConversationType.PRIVATE })
    });

    describe("#getConversations", () => {

      context('As an admin', () => {

        it('allows me to read customer chats', async () => {
          const chats = await abilities(admin).getConversations({ type: ConversationType.CUSTOMER });

          expect(chats.length).to.eq(5);
          expect(_.uniq(_.map(chats, 'type'))).to.deep.eq([ConversationType.CUSTOMER])
        })

        it('allows me to read public chats', async () => {
          const chats = await abilities(admin).getConversations({ type: ConversationType.PUBLIC });

          expect(chats.length).to.eq(4);
          expect(_.uniq(_.map(chats, 'type'))).to.deep.eq([ConversationType.PUBLIC])
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chats = await abilities(admin).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(0);
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [admin] } }
          )

          const chats = await abilities(admin).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(1);
          expect(chats[0]).to.deep.eq(myPrivateChat)
        })
      })

      context('As an staff member with Customer permissions', () => {

        it('allows me to read customer chats', async () => {
          const chats = await abilities(customerStaff).getConversations({ type: ConversationType.CUSTOMER });

          expect(chats.length).to.eq(5);
          expect(_.uniq(_.map(chats, 'type'))).to.deep.eq([ConversationType.CUSTOMER])
        })

        it('allows me to read public chats', async () => {
          const chats = await abilities(customerStaff).getConversations({ type: ConversationType.PUBLIC });

          expect(chats.length).to.eq(4);
          expect(_.uniq(_.map(chats, 'type'))).to.deep.eq([ConversationType.PUBLIC])
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chats = await abilities(customerStaff).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(0);
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [customerStaff] } }
          )

          const chats = await abilities(customerStaff).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(1);
          expect(chats[0]).to.deep.eq(myPrivateChat)
        })
      })

      context('As an staff member with no permissions', () => {

        it('prevents me from reading customer chats', async () => {
          const chats = await abilities(baseStaff).getConversations({ type: ConversationType.CUSTOMER });

          expect(chats.length).to.eq(0);
        })

        it('allows me to read public chats', async () => {
          const chats = await abilities(baseStaff).getConversations({ type: ConversationType.PUBLIC });

          expect(chats.length).to.eq(4);
          expect(_.uniq(_.map(chats, 'type'))).to.deep.eq([ConversationType.PUBLIC])
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chats = await abilities(baseStaff).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(0);
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [baseStaff] } }
          )

          const chats = await abilities(baseStaff).getConversations({ type: ConversationType.PRIVATE });
          expect(chats.length).to.eq(1);
          expect(chats[0]).to.deep.eq(myPrivateChat)
        })
      })
    })
    describe("#getConversationById", () => {

      context('As an admin', () => {

        it('allows me to read one customer chat by ID', async () => {
          const chat = await abilities(admin).getConversationById(customerChats[0].id);
          expect(chat).to.deep.equal(customerChats[0]);
        })

        it('allows me to read one public chats by ID', async () => {
          const chat = await abilities(admin).getConversationById(publicChats[0].id);
          expect(chat).to.deep.equal(publicChats[0]);
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chat = await abilities(admin).getConversationById(privateChats[0].id);
          expect(chat).to.be.null
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [admin] } }
          )

          const chat = await abilities(admin).getConversationById(myPrivateChat.id);
          expect(chat).to.deep.equal(myPrivateChat);
        })
      })

      context('As an staff member with Customer permissions', () => {

        it('allows me to read one customer chat by ID', async () => {
          const chat = await abilities(customerStaff).getConversationById(customerChats[0].id);
          expect(chat).to.deep.equal(customerChats[0]);
        })

        it('allows me to read one public chats by ID', async () => {
          const chat = await abilities(customerStaff).getConversationById(publicChats[0].id);
          expect(chat).to.deep.equal(publicChats[0]);
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chat = await abilities(customerStaff).getConversationById(privateChats[0].id);
          expect(chat).to.be.null
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [customerStaff] } }
          )

          const chat = await abilities(customerStaff).getConversationById(myPrivateChat.id);
          expect(chat).to.deep.equal(myPrivateChat);
        })
      })

      context('As an staff member with no permissions', () => {

        it('prevents me from reading one customer chat by ID', async () => {
          const chat = await abilities(baseStaff).getConversationById(customerChats[0].id);
          expect(chat).to.be.null
        })

        it('allows me to read one public chats by ID', async () => {
          const chat = await abilities(baseStaff).getConversationById(publicChats[0].id);
          expect(chat).to.deep.equal(publicChats[0]);
        })

        it('does not allow me to view private chats I am not a member of', async () => {
          const chat = await abilities(baseStaff).getConversationById(privateChats[0].id);
          expect(chat).to.be.null
        })

        it('allows me to view a private chat I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [baseStaff] } }
          )

          const chat = await abilities(baseStaff).getConversationById(myPrivateChat.id);
          expect(chat).to.deep.equal(myPrivateChat);
        })
      })
    })

    describe('#joinConversation', () => {

      context('As an admin', () => {

        it('allows me to join a customer chat', async () => {
          const { conversationId, staffId } = await abilities(admin).joinConversation(customerChats[0].id);

          expect(conversationId).to.equal(customerChats[0].id);
          expect(staffId).to.equal(admin.id);
          expect(await membersOf(customerChats[0].id)).to.include(admin.id)
        })

        it('allows me to join a public chat', async () => {
          const { conversationId, staffId } = await abilities(admin).joinConversation(publicChats[0].id);

          expect(conversationId).to.equal(publicChats[0].id);
          expect(staffId).to.equal(admin.id);
          expect(await membersOf(publicChats[0].id)).to.include(admin.id)
        })

        it('does not allow me to add myself to private chats I am not a member of', async () => {
          await expect(
            abilities(admin).joinConversation(privateChats[0].id)
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })
      })

      context('As an staff with customer permissions', () => {

        it('allows me to join a customer chat', async () => {
          const { conversationId, staffId } = await abilities(customerStaff).joinConversation(customerChats[0].id);

          expect(conversationId).to.equal(customerChats[0].id);
          expect(staffId).to.equal(customerStaff.id);
          expect(await membersOf(customerChats[0].id)).to.include(customerStaff.id)
        })

        it('allows me to join a public chat', async () => {
          const { conversationId, staffId } = await abilities(customerStaff).joinConversation(publicChats[0].id);

          expect(conversationId).to.equal(publicChats[0].id);
          expect(staffId).to.equal(customerStaff.id);
          expect(await membersOf(publicChats[0].id)).to.include(customerStaff.id)
        })

        it('does not allow me to add myself to private chats I am not a member of', async () => {
          await expect(
            abilities(customerStaff).joinConversation(privateChats[0].id)
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })
      })

      context('As an staff with no permissions', () => {

        it('does not allow me to join a customer chat', async () => {
          await expect(
            abilities(baseStaff).joinConversation(customerChats[0].id)
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })

        it('allows me to join a public chat', async () => {
          const { conversationId, staffId } = await abilities(baseStaff).joinConversation(publicChats[0].id);

          expect(conversationId).to.equal(publicChats[0].id);
          expect(staffId).to.equal(baseStaff.id);
          expect(await membersOf(publicChats[0].id)).to.include(baseStaff.id)
        })

        it('does not allow me to add myself to private chats I am not a member of', async () => {
          await expect(
            abilities(baseStaff).joinConversation(privateChats[0].id)
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })
      })
    })

    describe('#addToConversation', () => {
      let otherStaff : Staff
      let otherAdmin : Staff

      beforeEach(async () => {
        otherStaff = await factories.staffFactory.create({ permissions: [] });
        otherAdmin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
      })

      _.each({
        'an admin': () => admin,
        'a staff with customer permissions': () => customerStaff
      }, (getStaff, staffType) => {

        context(`As ${staffType}`, () => {
          it('allows me add an entitled user to a customer chat', async () => {
            const { conversationId, staffId } = await abilities(getStaff()).addToConversation(
              customerChats[0].id,
              otherAdmin
            );

            expect(conversationId).to.equal(customerChats[0].id);
            expect(staffId).to.equal(otherAdmin.id);
            expect(await membersOf(customerChats[0].id)).to.include(otherAdmin.id)
          })

          it('prevents me from adding an user without permissions to a customer chat', async () => {
            await expect(
              abilities(getStaff()).addToConversation(
                customerChats[0].id,
                otherStaff
              )
            ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
          })

          it('allows me add a user to a public chat', async () => {
            const { conversationId, staffId } = await abilities(getStaff()).addToConversation(
              publicChats[0].id,
              otherStaff
            );

            expect(conversationId).to.equal(publicChats[0].id);
            expect(staffId).to.equal(otherStaff.id);
            expect(await membersOf(publicChats[0].id)).to.include(otherStaff.id)
          })

          it('prevents me from adding a user to a private chat I don\'t belong to', async () => {
            await expect(
              abilities(getStaff()).addToConversation(
                privateChats[0].id,
                otherAdmin
              )
            ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
          })

          it('allows me to add a user to a private chat I belong to', async () => {
            const myPrivateChat = await factories.conversationFactory.create(
              { type: ConversationType.PRIVATE },
              { transient: { members: [getStaff()] } }
            )

            const { conversationId, staffId } = await abilities(getStaff()).addToConversation(
              myPrivateChat.id,
              otherStaff
            );

            expect(conversationId).to.equal(myPrivateChat.id);
            expect(staffId).to.equal(otherStaff.id);
            expect(await membersOf(myPrivateChat.id)).to.include(otherStaff.id)
          })
        })
      });

      context(`As staff member with no permissions`, () => {
        it('prevents me from adding a user to a customer chat', async () => {
          await expect(
            abilities(baseStaff).addToConversation(
              customerChats[0].id,
              otherAdmin
            )
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })

        it('allows me add a user to a public chat', async () => {
          const { conversationId, staffId } = await abilities(baseStaff).addToConversation(
            publicChats[0].id,
            otherStaff
          );

          expect(conversationId).to.equal(publicChats[0].id);
          expect(staffId).to.equal(otherStaff.id);
          expect(await membersOf(publicChats[0].id)).to.include(otherStaff.id)
        })

        it('prevents me from adding a user to a private chat I don\'t belong to', async () => {
          await expect(
            abilities(baseStaff).addToConversation(
              privateChats[0].id,
              otherStaff
            )
          ).to.be.rejectedWith(GoodchatError, 'errors.forbidden')
        })

        it('allows me to add a user to a private chat I belong to', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [baseStaff] } }
          )

          const { conversationId, staffId } = await abilities(baseStaff).addToConversation(
            myPrivateChat.id,
            otherStaff
          );

          expect(conversationId).to.equal(myPrivateChat.id);
          expect(staffId).to.equal(otherStaff.id);
          expect(await membersOf(myPrivateChat.id)).to.include(otherStaff.id)
        })
      })
    })
  })

  describe('Message abilities', () => {
    let customerChat          : Conversation
    let privateChat           : Conversation
    let publicChat            : Conversation
    let customerChatMessages  : Message[]
    let privateChatMessages   : Message[]
    let publicChatMessages    : Message[]

    beforeEach(async () => {
      // Populate the database with some conversations
      customerChat = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
      publicChat   = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
      privateChat  = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
      customerChatMessages = await factories.messageFactory.createList(2, { conversationId: customerChat.id })
      privateChatMessages = await factories.messageFactory.createList(2, { conversationId: privateChat.id })
      publicChatMessages = await factories.messageFactory.createList(2, { conversationId: publicChat.id })
    });

    describe("#getMessages", () => {

      context('As an admin', () => {
        it('allows me to read messages from customer chats', async () => {
          const messages = await abilities(admin).getMessages({ conversationId: customerChat.id });
          expect(messages).to.deep.eq(customerChatMessages);
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

      describe('Forward to Sunshine Conversations', () => {
        let whatsappConversation : Conversation
        let localConversation : Conversation
        let postMessageStub : sinon.SinonStub

        beforeEach(async () => {
          postMessageStub = sinon.stub(MessagesApi.prototype, 'postMessage').returns(Promise.resolve({
            messages: [
              factories.sunshineMessageFactory.build({ id: 'aSunshineId' })
            ]
          }))
          whatsappConversation  = await factories.conversationFactory.create({type: ConversationType.CUSTOMER })
          localConversation  = await factories.conversationFactory.create({type: ConversationType.PUBLIC })
        })

        afterEach(() => postMessageStub.restore())

        context('for a customer conversation', () => {
          it('pushes the message to sunshine conversation', async () => {
            expect(postMessageStub.callCount).to.eq(0);
            const message = await abilities(admin, BLANK_CONFIG).sendMessage(whatsappConversation.id, {
              type: 'text',
              text: 'Hi'
            });
            expect(postMessageStub.callCount).to.eq(1);
            expect(postMessageStub.getCall(0).args).to.deep.eq([
              BLANK_CONFIG.smoochAppId,
              whatsappConversation.sunshineConversationId,
              {
                author: {
                  displayName: "goodchat",
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
            await abilities(admin, BLANK_CONFIG).sendMessage(localConversation.id, {
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
  })
});
