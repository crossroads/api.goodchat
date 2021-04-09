import { expect }                                   from 'chai'
import * as factories                               from '../../../factories'
import { ApolloServerTestClient }                   from 'apollo-server-testing'
import { createGoodchatServer }                     from '../../../spec_helpers/agent'
import db                                           from '../../../../lib/db';
import { gql }                                      from 'apollo-server-koa';
import _                                            from 'lodash';
import { Conversation, ConversationType, Staff }    from '@prisma/client';
import { clearCurrentUser, setCurrentUser }         from '../../../spec_helpers/fake_auth';


describe('GraphQL Conversations Query', () => {
  let gqlAgent                : ApolloServerTestClient
  
  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });
  
  afterEach(() => clearCurrentUser())
  
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
      beforeEach(async () => {
        await factories.conversationFactory.createList(3,
          { type: ConversationType.PRIVATE }, {
          transient: { members: [otherUser] }
        })

        expect(await db.conversation.count()).to.eq(3)
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
    })

    context('in which he/she is a member', () => {
      beforeEach(async () => {
        await factories.conversationFactory.createList(3,
          { type: ConversationType.PRIVATE }, {
          transient: { members: [user] }
        })

        expect(await db.conversation.count()).to.eq(3)
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

        expect(data.conversations.length).to.eq(3)
      })
    })
  })

  context('Reading public chats', () => {
    let user          : Staff
    let otherUser     : Staff

    beforeEach(async () => {
      user = await factories.staffFactory.create({ permissions: [] });
      otherUser = await factories.staffFactory.create({ permissions: [] });

      setCurrentUser(user);

      await factories.conversationFactory.createList(3,
        { type: ConversationType.PUBLIC }, {
        transient: { members: [user] }
      })
      await factories.conversationFactory.createList(3,
        { type: ConversationType.PUBLIC }, {
        transient: { members: [otherUser] }
      })

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
  })
});
