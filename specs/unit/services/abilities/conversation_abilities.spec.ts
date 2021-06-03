import { abilities }                                       from '../../../../lib/services/abilities'
import * as factories                                      from '../../../factories'
import { expect }                                          from 'chai'
import _                                                   from 'lodash'
import { Conversation, ConversationType, Staff }           from '@prisma/client'
import { GoodChatPermissions }                             from '../../../../lib/typings/goodchat'
import { GoodchatError }                                   from '../../../../lib/utils/errors'
import db                                                  from '../../../../lib/db'

const membersOf = async (conversationId: number) : Promise<number[]> => {
  const records = await db.staffConversations.findMany({
    where: { conversationId }
  });
  return _.map(records, 'staffId');
}

describe('Services/Abilities/Conversation', () => {
  let admin         : Staff
  let customerStaff : Staff
  let baseStaff     : Staff
  let customerChats : Conversation[]
  let privateChats  : Conversation[]
  let publicChats   : Conversation[]

  beforeEach(async () => {
    // Create 3 users, one for each permission
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] });
    baseStaff = await factories.staffFactory.create({ permissions: [] });

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

    describe('Filtering on staff\'s active conversations with staffId', () => {
      it('returns only the conversation of a staff member that I am also allowed to view', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [admin, baseStaff] } }
        )

        const myPublicChat = await factories.conversationFactory.create(
          { type: ConversationType.PUBLIC },
          { transient: { members: [admin, baseStaff] } }
        )

        const otherPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff] } }
        )

        const chats = await abilities(admin).getConversations({ staffId: baseStaff.id });
        const chatIds = _.uniq(_.map(chats, 'id'));

        expect(await db.conversation.count()).to.eq(15)
        expect(chatIds.length).to.eq(2);
        expect(chatIds).to.include(myPublicChat.id);
        expect(chatIds).to.include(myPrivateChat.id);
        expect(chatIds).not.to.include(otherPrivateChat.id);
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
});
