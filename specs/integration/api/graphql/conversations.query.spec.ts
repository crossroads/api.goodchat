import { expect }                            from 'chai'
import * as factories                        from '../../../factories'
import { ApolloServerTestClient }            from 'apollo-server-testing'
import { createGoodchatServer }              from '../../../spec_helpers/agent'
import db                                    from '../../../../lib/db';
import { gql }                               from 'apollo-server-koa';
import _                                     from 'lodash';
import { clearCurrentUser, setCurrentUser }  from '../../../spec_helpers/fake_auth';
import { GoodChatPermissions }               from '../../../../lib/typings/goodchat';
import timekeeper                            from 'timekeeper';
import * as computer                         from '../../../../lib/services/computer'
import sinon                                 from 'sinon'
import {
  AuthorType,
  Conversation,
  ConversationType,
  Customer,
  Message,
  Staff,
  Tag
} from '@prisma/client';

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
      setCurrentUser(user)
    })

    context('by type', () => {

      beforeEach(async () => {
        await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });
        await factories.conversationFactory.create({ type: ConversationType.PUBLIC });
        await factories.conversationFactory.create(
          { type: ConversationType.PRIVATE },
          { transient: { members: [user] } }
        );
      });

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

    context('by tags', () => {
      let funTag    : Tag
      let sadTag    : Tag
      let coolTag   : Tag
      let funChats  : Conversation[]
      let sadChats  : Conversation[]
      let coolChats : Conversation[]

      beforeEach(async () => {
        funTag = await factories.tagFactory.create({ name: "fun" })
        sadTag = await factories.tagFactory.create({ name: "sad" })
        coolTag = await factories.tagFactory.create({ name: "cool" })

        funChats = await factories.conversationFactory.createList(3,
          { type: ConversationType.PUBLIC },
          { transient: { tags: ["fun"] } }
        )

        sadChats = await factories.conversationFactory.createList(3,
          { type: ConversationType.PUBLIC },
          { transient: { tags: ["sad"] } }
        )

        coolChats = await factories.conversationFactory.createList(3,
          { type: ConversationType.PUBLIC },
          { transient: { tags: ["cool"] } }
        )
      })

      it('should filter by tag ids', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations(tagIds: [${funTag.id}, ${coolTag.id}]) {
                id
                tags {
                  name
                }
              }
            }
          `
        })

        expect(errors).to.be.undefined

        const chatIds = _.uniq(_.map(data.conversations, 'id'));
        const expectedIds = _.map([...funChats, ...coolChats], 'id');
        const undesiredIds = _.map(sadChats, 'id');

        expect(chatIds.length).to.eq(6);
        expect(chatIds).to.include.members(expectedIds);
        expect(chatIds).not.to.include.members(undesiredIds);
      });
    });
  });

  describe('Pagination', () => {
    let user : Staff
    let conversations : Conversation[]

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

      conversations = await Promise.all(
        _.range(10).map(i => (
          factories.conversationFactory.create({
            type: ConversationType.PUBLIC,
            updatedAt: new Date(Date.now() - i * 60000)
          })
        ))
      )

      setCurrentUser(user)
    })

    it('return the first page of conversations', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations(limit: 4) {
              id
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(4)
      expect(
        _.map(data.conversations, 'id')
      ).to.deep.eq(
        _.map(conversations.slice(0, 4), 'id')
      )
    })

    it('return the second page of conversations using an after cursor', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations(limit: 4, after: ${conversations[3].id}) {
              id
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(4)
      expect(
        _.map(data.conversations, 'id')
      ).to.deep.eq(
        _.map(conversations.slice(4, 8), 'id')
      )
    })

    describe('Paginating nested messages', () => {
      let conversation : Conversation
      let messages : Message[]

      beforeEach(async () => {
        conversation = conversations[0];
        messages = await Promise.all(
          _.range(10).map(i => (
            factories.messageFactory.create({
              conversationId: conversation.id,
              createdAt: new Date(Date.now() - i * 60000)
            })
          ))
        )
      })

      it('return the first page of messages', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversation(id: ${conversation.id}) {
                id
                messages(limit: 4) {
                  id
                  content
                }
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.conversation).to.exist
        expect(data.conversation.messages).to.have.lengthOf(4);
        expect(
          _.map(data.conversation.messages, 'id')
        ).to.deep.eq(
          _.map(messages.slice(0, 4), 'id')
        )
      })

      it('returns the second page of messages using an after cursor', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversation(id: ${conversation.id}) {
                id
                messages(limit: 4, after: ${messages[3].id}) {
                  id
                  content
                }
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.conversation).to.exist
        expect(data.conversation.messages).to.have.lengthOf(4);
        expect(
          _.map(data.conversation.messages, 'id')
        ).to.deep.eq(
          _.map(messages.slice(4, 8), 'id')
        )
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
        { transient: { members: [user], tags: ["fun", "cool"] }
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

    it('supports reading the read receipts of a conversation', async () => {
      const { id } = await factories.readReceiptFactory.create({
        conversationId: conversation.id,
        userId: customer.id,
        userType: AuthorType.CUSTOMER,
        lastReadMessageId: message.id
      })

      const { data } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              readReceipts {
                id
                lastReadMessageId
                userType
                userId
              }
            }
          }
        `
      })

      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].readReceipts).to.have.lengthOf(1)
      expect(data.conversations[0].readReceipts[0].id).to.eq(id)
      expect(data.conversations[0].readReceipts[0].userId).to.eq(customer.id)
      expect(data.conversations[0].readReceipts[0].userType).to.eq(AuthorType.CUSTOMER)
    })

    it('supports reading the tags of a conversation', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              tags {
                name
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].tags).to.have.lengthOf(2)
      expect(
        _.map(data.conversations[0].tags, 'name')
      ).to.include.members(["fun", "cool"])
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

  describe('Computed properties', () => {
    let user                : Staff
    let conversation        : Conversation
    let messages            : Message[]
    let computeUnreadSpy    : sinon.SinonSpy
    let computeTotalSpy     : sinon.SinonSpy

    beforeEach(async () => {
      const now = Date.now();

      user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
      conversation = await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });

      setCurrentUser(user)

      messages = [
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 1000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 2000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 3000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 4000) }),
        await factories.messageFactory.create({ conversationId: conversation.id, createdAt: new Date(now + 5000) })
      ]

      expect(await db.conversation.count()).to.eq(1)
      expect(await db.message.count()).to.eq(5)

      computeUnreadSpy = sinon.spy(computer, 'computeUnreadMessageCount');
      computeTotalSpy = sinon.spy(computer, 'computeMessageCount');
    })

    afterEach(() => sinon.restore())

    it('supports totalMessageCount', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              _computed {
                totalMessageCount
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0]._computed.totalMessageCount).to.eq(5)
    })

    it('supports unreadMessageCount', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              _computed {
                unreadMessageCount
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0]._computed.unreadMessageCount).to.eq(5)
    })

    it('sets unreadMessageCount based on the user\'s read receipts', async () => {
      await factories.readReceiptFactory.create({
        conversationId: conversation.id,
        userId: user.id,
        userType: AuthorType.STAFF,
        lastReadMessageId: messages[1].id // second message is read
      })

      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              id
              type
              _computed {
                unreadMessageCount
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.conversations).to.be.of.length(1)
      expect(data.conversations[0].id).to.eq(conversation.id)
      expect(data.conversations[0].type).to.eq('CUSTOMER')
      expect(data.conversations[0]._computed.unreadMessageCount).to.eq(3)
    })

    it('computes counters using the computer service', async () => {
      const { errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              _computed {
                totalMessageCount
                unreadMessageCount
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined

      expect(computeTotalSpy.calledOnceWithExactly(
        conversation.id
      )).to.be.true

      expect(computeUnreadSpy.calledOnceWithExactly(
        user.id,
        conversation.id
      )).to.be.true
    })

    it('does not compute counters that are not requested', async () => {
      const { errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversations {
              _computed {
                totalMessageCount
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined

      expect(computeTotalSpy.calledOnceWithExactly(
        conversation.id
      )).to.be.true

      expect(computeUnreadSpy.callCount).to.eq(0)
    })
  })

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
