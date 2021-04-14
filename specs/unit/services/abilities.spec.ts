import { abilities }                                       from '../../../lib/services/abilities'
import * as factories                                      from '../../factories'
import { expect }                                          from 'chai'
import _                                                   from 'lodash'
import { Conversation, ConversationType, Message, Staff }  from '@prisma/client'
import { GoodChatPermissions }                             from '../../../lib/typings/goodchat'

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

          expect(messages).to.deep.eq(myMessages);
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

          expect(messages).to.deep.eq(myMessages);
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

          expect(messages).to.deep.eq(myMessages);
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
  })
});
