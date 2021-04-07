import { expect }                                   from 'chai'
import * as factories                               from '../../../factories'
import { ApolloServerTestClient }                   from 'apollo-server-testing'
import { createGoodchatServer }                     from '../../../spec_helpers/agent'
import db                                           from '../../../../lib/db';
import { gql }                                      from 'apollo-server-koa';
import _                                            from 'lodash';
import { Conversation }                             from '@prisma/client';
import { clearCurrentUser, setCurrentUser }         from '../../../spec_helpers/fake_auth';

describe('GraphQL Conversations Query', () => {
  let gqlAgent              : ApolloServerTestClient
  let publicConversations   : Conversation[]
  let privateConversations  : Conversation[]

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    publicConversations = await factories.conversationFactory.createList(3, { private: false });
    privateConversations = await factories.conversationFactory.createList(4, { private: true });
    expect(await db.conversation.count()).to.eq(7)
  })

  afterEach(() => clearCurrentUser())

  context('Reading public chats', () => {    

    context('As a user witjout chat:customer permissions', () => {
      beforeEach(async () => {
        setCurrentUser(await factories.staffFactory.create({ permissions: [] }))
      })

      it('doesnt return any customer chat', async () => {
        const { data } = await gqlAgent.query({
          query: gql`
            query getConversations {
              conversations(private: false) {
                id
                private
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
              conversations(private: false) {
                id
              }
            }
          `
        })

        expect(data.conversations.length).to.eq(3)
        expect(_.map(data.conversations, 'id')).to.deep.eq(
          _.chain(publicConversations).orderBy(['id'], ['desc']).map('id').value()
        )
      })
    })
  })
});
