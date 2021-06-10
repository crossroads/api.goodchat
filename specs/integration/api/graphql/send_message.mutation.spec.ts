import { expect }                                                                  from 'chai'
import * as factories                                                              from '../../../factories'
import { ApolloServerTestClient }                                                  from 'apollo-server-testing'
import { createGoodchatServer }                                                    from '../../../spec_helpers/agent'
import db                                                                          from '../../../../lib/db';
import { gql }                                                                     from 'apollo-server-koa';
import _                                                                           from 'lodash';
import { AuthorType, Conversation, ConversationType, Customer, Staff }             from '@prisma/client';
import { clearCurrentUser, setCurrentUser }                                        from '../../../spec_helpers/fake_auth';
import { GoodChatPermissions }                                                     from '../../../../lib/typings/goodchat';
import sinon                                                                       from 'sinon';
import { MessagesApi }                                                             from 'sunshine-conversations-client';


describe('GraphQL SendMessage mutations', () => {
  let gqlAgent              : ApolloServerTestClient
  let admin                 : Staff
  let customerStaff         : Staff
  let baseStaff             : Staff
  let customer              : Customer
  let customerConversation  : Conversation
  let publicConversation    : Conversation
  let privateConversation   : Conversation
  let postMessageStub       : sinon.SinonStub

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    postMessageStub = sinon.stub(MessagesApi.prototype, 'postMessage').returns(Promise.resolve({
      messages: [factories.sunshineMessageFactory.build()]
    }))

    // Create staff members
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] })
    baseStaff = await factories.staffFactory.create({ permissions: [] })

    // Create conversations
    customer = await factories.customerFactory.create();
    customerConversation = await factories.conversationFactory.create({
      customerId: customer.id,
      type: ConversationType.CUSTOMER
    })
    publicConversation = await factories.conversationFactory.create({ type: ConversationType.PUBLIC })
    privateConversation = await factories.conversationFactory.create({ type: ConversationType.PRIVATE })

    expect(await db.conversation.count()).to.eq(3);
    expect(await db.message.count()).to.eq(0);
  });

  afterEach(() => {
    clearCurrentUser()
    postMessageStub.restore();
  })

  describe('Sending a text message to a customer chat', () => {
    context('As an admin', () => {
      beforeEach(() => {
        setCurrentUser(admin);
      })

      it('creates the message successfully', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${customerConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(await db.message.count()).to.equal(1)
        expect(data).to.deep.equal({
          sendMessage: {
            authorType: AuthorType.STAFF,
            authorId: admin.id,
            content: { text: 'Hi Steve', type: 'text' }
          }
        })
      })
    })

    context('As a staff with customer permissions', () => {
      beforeEach(() => {
        setCurrentUser(customerStaff);
      })

      it('creates the message successfully', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${customerConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(await db.message.count()).to.equal(1)
        expect(data).to.deep.equal({
          sendMessage: {
            authorType: AuthorType.STAFF,
            authorId: customerStaff.id,
            content: { text: 'Hi Steve', type: 'text' }
          }
        })
      })
    })

    context('As a staff with no permissions', () => {
      beforeEach(() => {
        setCurrentUser(baseStaff);
      })

      it('returns a 403', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${customerConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
              }
            }
          `
        })
        expect(errors).to.deep.equal([
          {
            message: 'Forbidden',
            locations: [{"column": 3, "line": 2}],
            path: [ 'sendMessage' ],
            extensions: {
              code: 'FORBIDDEN', exception: {
                "error": "Forbidden",
                "status": 403,
                "type": "ForbiddenError"
              }
            }
          }
        ])
      })
    })
  });

  describe('Sending a text message to a public chat', () => {
    context('As an admin', () => {
      beforeEach(() => {
        setCurrentUser(admin);
      })

      it('creates the message successfully', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${publicConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
                conversationId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(await db.message.count()).to.equal(1)
        expect(data).to.deep.equal({
          sendMessage: {
            authorType: AuthorType.STAFF,
            authorId: admin.id,
            conversationId: publicConversation.id,
            content: { text: 'Hi Steve', type: 'text' }
          }
        })
      })
    })

    context('As a staff with customer permissions', () => {
      beforeEach(() => {
        setCurrentUser(customerStaff);
      })

      it('creates the message successfully', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${publicConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
                conversationId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(await db.message.count()).to.equal(1)
        expect(data).to.deep.equal({
          sendMessage: {
            authorType: AuthorType.STAFF,
            authorId: customerStaff.id,
            conversationId: publicConversation.id,
            content: { text: 'Hi Steve', type: 'text' }
          }
        })
      })
    })

    context('As a staff with no permissions', () => {
      beforeEach(() => {
        setCurrentUser(baseStaff);
      })

      it('creates the message successfully', async () => {
        const { errors, data } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation SendMessage {
              sendMessage(conversationId: ${publicConversation.id}, text: "Hi Steve") {
                authorType
                authorId
                content
                conversationId
              }
            }
          `
        })
        expect(errors).to.be.undefined
        expect(await db.message.count()).to.equal(1)
        expect(data).to.deep.equal({
          sendMessage: {
            authorType: AuthorType.STAFF,
            authorId: baseStaff.id,
            conversationId: publicConversation.id,
            content: { text: 'Hi Steve', type: 'text' }
          }
        })
      })
    })
  });

  describe('Sending a text message to a private chat I\'m not a member of', () => {

    _.each({
      "admin": () => admin,
      "staff with customer permissions": () => customerStaff,
      "a staff with no permissions": () => baseStaff
    }, (getStaff, staffType) => {
      context(`As an ${staffType}`, () => {
        beforeEach(() => setCurrentUser(getStaff()))

        it('returns a 403', async () => {
          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation SendMessage {
                sendMessage(conversationId: ${privateConversation.id}, text: "Hi Steve") {
                  authorType
                  authorId
                  content
                }
              }
            `
          })
          expect(errors).to.deep.equal([
            {
              message: 'Forbidden',
              locations: [{"column": 3, "line": 2}],
              path: [ 'sendMessage' ],
              extensions: {
                code: 'FORBIDDEN', exception: {
                  "error": "Forbidden",
                  "status": 403,
                  "type": "ForbiddenError"
                }
              }
            }
          ])
        })
      });
    })
  });

  describe('Sending a text message to my own private chat', () => {
    let myPrivateChat : Conversation

    _.each({
      "admin": () => admin,
      "staff with customer permissions": () => customerStaff,
      "a staff with no permissions": () => baseStaff
    }, (getStaff, staffType) => {
      context(`As an ${staffType}`, () => {
        beforeEach(async () => {
          setCurrentUser(getStaff())
          myPrivateChat = await factories.conversationFactory.create(
            { type: ConversationType.PRIVATE },
            { transient: { members: [getStaff()] } }
          )
        })

        it('creates the message successfully', async () => {
          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation SendMessage {
                sendMessage(conversationId: ${myPrivateChat.id}, text: "Hi Steve") {
                  authorType
                  authorId
                  content
                  conversationId
                }
              }
            `
          })
          expect(errors).to.be.undefined
          expect(await db.message.count()).to.equal(1)
          expect(data).to.deep.equal({
            sendMessage: {
              authorType: AuthorType.STAFF,
              authorId: getStaff().id,
              conversationId: myPrivateChat.id,
              content: { text: 'Hi Steve', type: 'text' }
            }
          })
        })
      });
    })
  });

  describe('Options', () => {
    beforeEach(async () => {
      setCurrentUser(admin)
    })

    it('can set the timestamp of the message as DateTime', async () => {
      const timestamp = new Date(Date.now() - 60000);

      const { errors, data } : any = await gqlAgent.mutate({
        variables: { timestamp },
        mutation: gql`
          mutation SendMessage($timestamp: DateTime) {
            sendMessage(
              conversationId: ${publicConversation.id},
              text: "Hi Steve",
              timestamp: $timestamp
            ) {
              createdAt
              updatedAt
              content
              conversationId
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(await db.message.count()).to.equal(1)
      expect(data).to.deep.equal({
        sendMessage: {
          createdAt: timestamp,
          updatedAt: timestamp,
          conversationId: publicConversation.id,
          content: { text: 'Hi Steve', type: 'text' }
        }
      })
    })

    it('can set the metadata of the message', async () => {
      const metadata = { some: { meta: 'data '} };

      const { errors, data } : any = await gqlAgent.mutate({
        variables: { metadata },
        mutation: gql`
          mutation SendMessage($metadata: JSON) {
            sendMessage(
              conversationId: ${publicConversation.id},
              text: "Hi Steve",
              metadata: $metadata
            ) {
              metadata
              content
              conversationId
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(await db.message.count()).to.equal(1)
      expect(data).to.deep.equal({
        sendMessage: {
          metadata: metadata,
          conversationId: publicConversation.id,
          content: { text: 'Hi Steve', type: 'text' }
        }
      })
    })
  });
});
