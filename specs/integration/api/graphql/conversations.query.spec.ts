import { expect }                                                                  from 'chai'
import * as factories                                                              from '../../../factories'
import { ApolloServerTestClient }                                                  from 'apollo-server-testing'
import { createGoodchatServer }                                                    from '../../../spec_helpers/agent'
import db                                                                          from '../../../../lib/db';
import { gql }                                                                     from 'apollo-server-koa';
import _                                                                           from 'lodash';
import { AuthorType, Conversation, ConversationType, Customer, Message, Staff }    from '@prisma/client';
import { clearCurrentUser, setCurrentUser }                                        from '../../../spec_helpers/fake_auth';
import { GoodChatPermissions }                                                     from '../../../../lib/typings/goodchat';
import timekeeper                                                                  from 'timekeeper';

const addDays = (date: Date, n: number) => {
  const day = 1000 * 60 * 60 * 24;
  return new Date(date.getTime() + n * day)
}

describe('GraphQL Conversations Query', () => {
  let gqlAgent : ApolloServerTestClient

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  afterEach(() => clearCurrentUser())

  describe('Filtering', () => {
    let user : Staff

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

      await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });
      await factories.conversationFactory.create({ type: ConversationType.PUBLIC });
      await factories.conversationFactory.create(
        { type: ConversationType.PRIVATE },
        { transient: { members: [user] } }
      );

      setCurrentUser(user)
    })

    context('by type', () => {
      [
        'CUSTOMER',
        'PRIVATE',
        'PUBLIC'
      ].forEach(type => {
        it(`should filter successfully on the ${type} type`, async () => {
          const { data, errors } : any = await gqlAgent.query({
            query: gql`
              query getConversations {
                conversations(type: ${type}) {
                  id
                  type
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.conversations).to.be.of.length(1)
          expect(data.conversations[0].type).to.eq(type)
        })
      })
    })
  })

  describe('Nested relationships', () => {
    let user                : Staff
    let conversation        : Conversation
    let message             : Message
    let customer            : Customer

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

      setCurrentUser(user)

      customer = await factories.customerFactory.create();

      conversation = await factories.conversationFactory.create(
        {
          customerId: customer.id,
          type: ConversationType.CUSTOMER
        },
        { transient: { members: [user] }
      })

      message = await factories.messageFactory.create({
        conversationId: conversation.id,
        authorId: user.id,
        authorType: AuthorType.STAFF
      })

      expect(await db.conversation.count()).to.eq(1)
    })

    it('supports reading the messages of a conversation', async () => {
      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              messages {
                id
                content
                conversation {
                  id
                }
              }
            }
          }
        `
      })

      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0].messages).to.be.of.length(1)
      expect(data.conversations[0].messages[0].id).to.eq(message.id)
      expect(data.conversations[0].messages[0].content).to.deep.eq(message.content)
      expect(data.conversations[0].messages[0].conversation).not.to.be.null
      expect(data.conversations[0].messages[0].conversation.id).to.eq(conversation.id)
    })

    it('supports reading the customer of a conversation', async () => {
      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              customer {
                id
                displayName
                conversations {
                  id
                }
              }
            }
          }
        `
      })

      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0].customer).not.to.be.null
      expect(data.conversations[0].customer.id).to.eq(customer.id)
      expect(data.conversations[0].customer.displayName).to.eq(customer.displayName)
      expect(data.conversations[0].customer.conversations).to.be.of.length(1)
      expect(data.conversations[0].customer.conversations[0].id).to.eq(conversation.id)
    })

    it('returns the messages ordered by most recent first by default', async () => {
      const now = new Date();

      timekeeper.travel(addDays(now, 5));

      const newestMessage = await factories.messageFactory.create({
        conversationId: conversation.id,
        authorId: user.id,
        authorType: AuthorType.STAFF
      })

      timekeeper.travel(addDays(now, 3));

      const newerMessage = await factories.messageFactory.create({
        conversationId: conversation.id,
        authorId: user.id,
        authorType: AuthorType.STAFF
      })

      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              messages {
                id
                content
                createdAt
                conversation {
                  id
                }
              }
            }
          }
        `
      })

      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].messages).to.be.of.length(3)
      expect(
        _.map(data.conversations[0].messages, 'id')
      ).to.deep.equal([
        newestMessage.id,
        newerMessage.id,
        message.id,
      ])
    })

    it('returns customer as null if it is not a customer conversation', async () => {
      const publicConversation = await factories.conversationFactory.create({
        type: ConversationType.PUBLIC
      })

      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversation(id: ${publicConversation.id}) {
              id
              type
              customer {
                id
                displayName
              }
            }
          }
        `
      })

      expect(data.conversation).not.to.be.null
      expect(data.conversation.id).to.eq(publicConversation.id)
      expect(data.conversation.type).to.eq('PUBLIC')
      expect(data.conversation.customer).to.be.null
    })

    it('supports reading the staff members of a conversation', async () => {
      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              staffs {
                id
                permissions
              }
            }
          }
        `
      })

      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0].staffs).to.be.of.length(1)
      expect(data.conversations[0].staffs[0].id).to.eq(user.id)
      expect(data.conversations[0].staffs[0].permissions).to.deep.eq(user.permissions)
    })

  });

  context('Reading customer chats', () => {
    let customerConversations   : Conversation[]

    beforeEach(async () => {
      customerConversations = await factories.conversationFactory.createList(3, { type: ConversationType.CUSTOMER });
      expect(await db.conversation.count()).to.eq(3)
    })

    context('As a user without chat:customer permissions', () => {
      beforeEach(async () => {
        setCurrentUser(await factories.staffFactory.create({ permissions: [] }))
      })

      it('doesnt return any customer chat', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations {
                id
                type
              }
            }
          `
        })

        expect(data.conversations.length).to.eq(0)
      })

      it('doesnt return a customer chat by id', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversation(id: ${customerConversations[0].id}) {
                id
                type
              }
            }
          `
        })

        expect(data.conversation).to.eq(null)
      })
    })

    context('As a user with chat:customer permissions', () => {

      beforeEach(async () => {
        setCurrentUser(await factories.staffFactory.create({ permissions: ['chat:customer'] }))
      })

      it('returns the customer chats ordered by most recent (desc)', async () => {
        const { data } = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations {
                id
              }
            }
          `
        })

        expect(data.conversations.length).to.eq(3)
        _.each(customerConversations, (cv) => {
          expect(_.map(data.conversations, 'id')).to.include(cv.id)
        })
      })

      it('returns a customer chat by its ID', async () => {
        const { data } = await gqlAgent.query({
          query: gql`
            query getConversation {
              conversation(id: ${customerConversations[0].id}) {
                id
              }
            }
          `
        })

        expect(data.conversation).not.to.be.null
        expect(data.conversation.id).to.eq(customerConversations[0].id)
      })
    })
  })

  context('Reading private chats', () => {
    let user          : Staff
    let otherUser     : Staff

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [] });
      otherUser = await factories.staffFactory.create({ permissions: [] });

      setCurrentUser(user);
    })

    context('of other users', () => {
      let privateConversations : Conversation[]

      beforeEach(async () => {
        privateConversations = await factories.conversationFactory.createList(3,
          { type: ConversationType.PRIVATE }, {
          transient: { members: [otherUser] }
        })

        expect(await db.conversation.count()).to.eq(3)
      })

      it('doesnt return any private chat', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations {
                id
                type
              }
            }
          `
        })

        expect(data.conversations.length).to.eq(0)
      })

      it('doesnt return a private chat by ID', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversation {
              conversation(id: ${privateConversations[0].id}) {
                id
                type
              }
            }
          `
        })

        expect(data.conversation).to.be.null
      })
    })

    context('in which he/she is a member', () => {
      let privateConversations : Conversation[]

      beforeEach(async () => {
        privateConversations = await factories.conversationFactory.createList(3,
          { type: ConversationType.PRIVATE }, {
          transient: { members: [user] }
        })

        expect(await db.conversation.count()).to.eq(3)
      })

      it('returns the user\'s private chats', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations {
                id
                type
              }
            }
          `
        })

        expect(data.conversations.length).to.eq(3)
      })

      it('doesnt return a private chat by ID', async () => {
        const { data } : any = await gqlAgent.query({
          query: gql`
            query getConversation {
              conversation(id: ${privateConversations[0].id}) {
                id
                type
              }
            }
          `
        })

        expect(data.conversation).not.to.be.null
      })
    })
  })

  context('Reading public chats', () => {
    let user          : Staff
    let otherUser     : Staff
    let publicChats   : Conversation[]

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [] });
      otherUser = await factories.staffFactory.create({ permissions: [] });

      setCurrentUser(user);

      publicChats = [
        ...await factories.conversationFactory.createList(3,
          { type: ConversationType.PUBLIC }, {
          transient: { members: [user] }
        }),
        ...await factories.conversationFactory.createList(3,
          { type: ConversationType.PUBLIC }, {
          transient: { members: [otherUser] }
        })
      ];

      expect(await db.conversation.count()).to.eq(6)
    })

    it('returns the chat regardless of whether he/she is a member', async () => {
      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
            }
          }
        `
      })

      expect(data.conversations.length).to.eq(6)
    })

    it('returns the public chat by ID', async () => {
      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversation {
            conversation(id: ${publicChats[0].id}) {
              id
              type
            }
          }
        `
      })

      expect(data.conversation.length).not.to.be.null;
      expect(data.conversation.id).to.eq(publicChats[0].id)
    })
  })
});
