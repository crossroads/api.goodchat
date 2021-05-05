import { AuthorType, Conversation, ConversationType, Customer, Message, Staff }  from '@prisma/client';
import { clearCurrentUser, setCurrentUser }                                      from '../../../spec_helpers/fake_auth'
import { ApolloServerTestClient }                                                from 'apollo-server-testing'
import { createGoodchatServer }                                                  from '../../../spec_helpers/agent'
import { GoodChatPermissions }                                                   from '../../../../lib/typings/goodchat'
import { ActivitiesApi }                                                         from 'sunshine-conversations-client'
import * as factories                                                            from '../../../factories'
import { expect }                                                                from 'chai'
import { gql }                                                                   from 'apollo-server-koa';
import config                                                                    from '../../../../lib/config'
import sinon                                                                     from 'sinon';
import _                                                                         from 'lodash';
import db                                                                        from '../../../../lib/db';


describe('GraphQL Mark Read mutation', () => {
  let gqlAgent              : ApolloServerTestClient
  let user                  : Staff
  let sunshineActivityStub  : sinon.SinonStub

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    sunshineActivityStub = sinon.stub(ActivitiesApi.prototype, 'postActivity');
    user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

    setCurrentUser(user);
  });

  afterEach(() => {
    clearCurrentUser()
    sunshineActivityStub.restore();
  })

  describe('Marking a conversation as read', () => {
    context('for a customer chat', () => {
      let conversation : Conversation
      let messages : Message[]

      const now = Date.now();

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER })
        messages = [
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000), updatedAt: new Date(now + 1000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000), updatedAt: new Date(now + 2000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000), updatedAt: new Date(now + 3000) })
        ]
      })

      it('creates a read receipt to the last message if it doesnt exist', async () => {
        expect(await db.readReceipt.count()).to.eq(0);

        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                userId
                userType
                lastReadMessageId
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(await db.readReceipt.count()).to.eq(1);
        expect(data.markAsRead.userId).to.eq(user.id)
        expect(data.markAsRead.userType).to.eq("STAFF")
        expect(data.markAsRead.lastReadMessageId).to.eq(messages[2].id)
      })

      it('updates the read receipt to the last message if already exists', async () => {
        const receipt = await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          userId: user.id,
          userType: AuthorType.STAFF,
          lastReadMessageId: messages[0].id
        })

        expect(await db.readReceipt.count()).to.eq(1);

        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                id
                userId
                userType
                lastReadMessageId
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(await db.readReceipt.count()).to.eq(1);
        expect(data.markAsRead.id).to.eq(receipt.id)
        expect(data.markAsRead.userId).to.eq(user.id)
        expect(data.markAsRead.userType).to.eq("STAFF")
        expect(data.markAsRead.lastReadMessageId).to.eq(messages[2].id)
      })

      it('sends the conversation:read event to sunshine', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                userId
                userType
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(1)
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
    })

    context('for a non-customer chat', () => {
      let conversation : Conversation
      let messages : Message[]

      const now = Date.now();

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
        messages = [
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000), updatedAt: new Date(now + 1000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000), updatedAt: new Date(now + 2000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000), updatedAt: new Date(now + 3000) })
        ]
      })

      it('creates a read receipt to the last message if it doesnt exist', async () => {
        expect(await db.readReceipt.count()).to.eq(0);

        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                userId
                userType
                lastReadMessageId
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(await db.readReceipt.count()).to.eq(1);
        expect(data.markAsRead.userId).to.eq(user.id)
        expect(data.markAsRead.userType).to.eq("STAFF")
        expect(data.markAsRead.lastReadMessageId).to.eq(messages[2].id)
      })

      it('updates the read receipt to the last message if already exists', async () => {
        const receipt = await factories.readReceiptFactory.create({
          conversationId: conversation.id,
          userId: user.id,
          userType: AuthorType.STAFF,
          lastReadMessageId: messages[0].id
        })

        expect(await db.readReceipt.count()).to.eq(1);

        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                id
                userId
                userType
                lastReadMessageId
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(await db.readReceipt.count()).to.eq(1);
        expect(data.markAsRead.id).to.eq(receipt.id)
        expect(data.markAsRead.userId).to.eq(user.id)
        expect(data.markAsRead.userType).to.eq("STAFF")
        expect(data.markAsRead.lastReadMessageId).to.eq(messages[2].id)
      })

      it('does not sends any event to sunshine', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                userId
                userType
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(sunshineActivityStub.callCount).to.eq(0)
      })
    })

    context('for a chat I do not have access to', () => {
      let conversation : Conversation
      let messages : Message[]

      const now = Date.now();

      beforeEach(async () => {
        conversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })
        messages = [
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000), updatedAt: new Date(now + 1000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000), updatedAt: new Date(now + 2000) }),
          await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000), updatedAt: new Date(now + 3000) })
        ]
      })

      it('returns a 403', async () => {
        expect(await db.readReceipt.count()).to.eq(0);

        const { errors } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation {
              markAsRead(conversationId: ${conversation.id}) {
                userId
                userType
                lastReadMessageId
              }
            }
          `
        })

        expect(errors).to.have.lengthOf(1);
        expect(errors[0].message).to.eq('Forbidden');
        expect(errors[0].extensions.code).to.eq('FORBIDDEN');
        expect(errors[0].extensions.exception).to.deep.eq({
          error: 'Forbidden',
          status: 403,
          type: 'ForbiddenError'
        })
      })
    })
  })
});
