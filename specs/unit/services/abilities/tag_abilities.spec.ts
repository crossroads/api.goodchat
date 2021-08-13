import { abilities }            from '../../../../lib/services/abilities'
import * as factories           from '../../../factories'
import { expect }               from 'chai'
import _                        from 'lodash'
import { GoodChatPermissions }  from '../../../../lib/typings/goodchat'
import { GoodchatError }        from '../../../../lib/utils/errors'
import db                       from '../../../../lib/db'
import {
  Conversation,
  ConversationType,
  Staff,
  Tag
} from '@prisma/client'

describe('Services/Abilities/Tag', () => {
  let tag           : Tag
  let admin         : Staff
  let customerStaff : Staff
  let baseStaff     : Staff

  beforeEach(async () => {
    tag = await factories.tagFactory.create();

    // Create 3 users, one for each permission
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] });
    baseStaff = await factories.staffFactory.create({ permissions: [] });
  });

  describe("#tagConversation", () => {
    let customerChat  : Conversation
    let privateChat   : Conversation
    let publicChat    : Conversation

    beforeEach(async () => {
      // Populate the database with some conversations
      customerChat = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
      publicChat   = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
      privateChat  = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
    })

    _.each({
      "admin": () => admin,
      "customer user": () => customerStaff
    }, (getUser, userType) => {
      context(`As a/an ${userType} `, () => {

        it('allows me to tag customer chats', async () => {
          expect(await db.conversationTags.count()).to.eq(0);

          await abilities(getUser()).tagConversation(customerChat.id, tag.id);

          expect(await db.conversationTags.count()).to.eq(1);

          const conversationTag = await db.conversationTags.findFirst();
          expect(conversationTag).to.have.property('tagId', tag.id)
          expect(conversationTag).to.have.property('conversationId', customerChat.id)
        })

        it('allows me to tag public chats', async () => {
          expect(await db.conversationTags.count()).to.eq(0);

          await abilities(getUser()).tagConversation(publicChat.id, tag.id);

          expect(await db.conversationTags.count()).to.eq(1);

          const conversationTag = await db.conversationTags.findFirst();
          expect(conversationTag).to.have.property('tagId', tag.id)
          expect(conversationTag).to.have.property('conversationId', publicChat.id)
        })

        it('does not allow me to tag private chats I am not a member of', async () => {
          expect(abilities(getUser()).tagConversation(privateChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
          expect(await db.conversationTags.count()).to.eq(0);
        })

        it('allows me to tag private chats that I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [getUser()] } }
          )

          expect(await db.conversationTags.count()).to.eq(0);

          await abilities(getUser()).tagConversation(myPrivateChat.id, tag.id);

          expect(await db.conversationTags.count()).to.eq(1);

          const conversationTag = await db.conversationTags.findFirst();
          expect(conversationTag).to.have.property('tagId', tag.id)
          expect(conversationTag).to.have.property('conversationId', myPrivateChat.id)
        })
      });

      it('touches the conversation after tagging it', async () => {
        await abilities(admin).tagConversation(publicChat.id, tag.id);

        expect(
          (await db.conversation.findUnique({ where: { id: publicChat.id }})).updatedAt
        ).to.be.greaterThan(publicChat.updatedAt)
      })
    })

    context('As a normal staff member', () => {

      it('allows me to tag public chats', async () => {
        expect(await db.conversationTags.count()).to.eq(0);

        await abilities(baseStaff).tagConversation(publicChat.id, tag.id);

        expect(await db.conversationTags.count()).to.eq(1);

        const conversationTag = await db.conversationTags.findFirst();
        expect(conversationTag).to.have.property('tagId', tag.id)
        expect(conversationTag).to.have.property('conversationId', publicChat.id)
      })

      it('does not allow me to tag private chats I am not a member of', async () => {
        expect(abilities(baseStaff).tagConversation(privateChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
        expect(await db.conversationTags.count()).to.eq(0);
      })

      it('does not allow me to tag customer chats', async () => {
        expect(abilities(baseStaff).tagConversation(customerChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
        expect(await db.conversationTags.count()).to.eq(0);
      })


      it('allows me to tag private chats that I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff] } }
        )

        expect(await db.conversationTags.count()).to.eq(0);

        await abilities(baseStaff).tagConversation(myPrivateChat.id, tag.id);

        expect(await db.conversationTags.count()).to.eq(1);

        const conversationTag = await db.conversationTags.findFirst();
        expect(conversationTag).to.have.property('tagId', tag.id)
        expect(conversationTag).to.have.property('conversationId', myPrivateChat.id)
      })
    });
  });

  describe("#untagConversation", () => {
    let customerChat  : Conversation
    let privateChat   : Conversation
    let publicChat    : Conversation

    beforeEach(async () => {
      // Populate the database with some tagged conversations
      [customerChat, publicChat, privateChat] = await Promise.all(
        [
          ConversationType.CUSTOMER,
          ConversationType.PUBLIC,
          ConversationType.PRIVATE
        ].map((type) => (
          factories.conversationFactory.create({ type }, { transient: { tags: [tag.name] } })
        ))
      )
    })

    _.each({
      "admin": () => admin,
      "customer user": () => customerStaff
    }, (getUser, userType) => {
      context(`As a/an ${userType} `, () => {

        it('allows me to untag customer chats', async () => {
          expect(await db.conversationTags.count({
            where: { conversationId: customerChat.id }
          })).to.eq(1);

          await abilities(getUser()).untagConversation(customerChat.id, tag.id);

          expect(await db.conversationTags.count({
            where: { conversationId: customerChat.id }
          })).to.eq(0);
        })

        it('allows me to untag public chats', async () => {
          expect(await db.conversationTags.count({
            where: { conversationId: publicChat.id }
          })).to.eq(1);

          await abilities(getUser()).untagConversation(publicChat.id, tag.id);

          expect(await db.conversationTags.count({
            where: { conversationId: publicChat.id }
          })).to.eq(0);
        })

        it('does not allow me to untag private chats I am not a member of', async () => {
          expect(abilities(getUser()).untagConversation(privateChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
        })

        it('allows me to untag private chats that I am a member of', async () => {
          const myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [getUser()], tags: [tag.name] } }
          )

          expect(await db.conversationTags.count({
            where: { conversationId: myPrivateChat.id }
          })).to.eq(1);

          await abilities(getUser()).untagConversation(myPrivateChat.id, tag.id);

          expect(await db.conversationTags.count({
            where: { conversationId: myPrivateChat.id }
          })).to.eq(0);
        })
      });
    })

    context('As a normal staff member', () => {

      it('allows me to untag public chats', async () => {
        expect(await db.conversationTags.count({
          where: { conversationId: publicChat.id }
        })).to.eq(1);

        await abilities(baseStaff).untagConversation(publicChat.id, tag.id);

        expect(await db.conversationTags.count({
          where: { conversationId: publicChat.id }
        })).to.eq(0);
      })

      it('does not allow me to untag private chats I am not a member of', async () => {
        expect(abilities(baseStaff).untagConversation(privateChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
      })

      it('does not allow me to tag customer chats', async () => {
        expect(abilities(baseStaff).untagConversation(customerChat.id, tag.id)).to.be.rejectedWith(GoodchatError)
      })


      it('allows me to untag private chats that I am a member of', async () => {
        const myPrivateChat = await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [baseStaff], tags: [tag.name] } }
        )

        expect(await db.conversationTags.count({
          where: { conversationId: myPrivateChat.id }
        })).to.eq(1);

        await abilities(baseStaff).untagConversation(myPrivateChat.id, tag.id);

        expect(await db.conversationTags.count({
          where: { conversationId: myPrivateChat.id }
        })).to.eq(0);
      })
    });

    it('touches the conversation after untagging it', async () => {
      await abilities(admin).untagConversation(publicChat.id, tag.id);

      expect(
        (await db.conversation.findUnique({ where: { id: publicChat.id }})).updatedAt
      ).to.be.greaterThan(publicChat.updatedAt)
    })
  });
});
