import { Conversation, ConversationType, Staff }    from '@prisma/client'
import { clearCurrentUser, setCurrentUser }         from '../../../spec_helpers/fake_auth'
import { ApolloServerTestClient }                   from 'apollo-server-testing'
import { createGoodchatServer }                     from '../../../spec_helpers/agent'
import { GoodChatPermissions }                      from '../../../../lib/typings/goodchat'
import * as factories                               from '../../../factories'
import { expect }                                   from 'chai'
import { gql }                                      from 'apollo-server-koa'
import _                                            from 'lodash'

describe('GraphQL Staff Queries', () => {
  let gqlAgent : ApolloServerTestClient
  let user : Staff
  let otherUser : Staff
  let userConversations : Conversation[]
  let otherUserPrivateConversation : Conversation
  let otherUserCustomerConversation : Conversation

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  afterEach(() => clearCurrentUser())

  beforeEach(async () => {
    user = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
    otherUser = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })

    await factories.conversationFactory.create({ type: ConversationType.CUSTOMER });
    await factories.conversationFactory.create({ type: ConversationType.PUBLIC });

    userConversations = [
      await factories.conversationFactory.create(
        { type: ConversationType.CUSTOMER },
        { transient: { members: [user] } }
      ),
      await factories.conversationFactory.create(
        { type: ConversationType.PRIVATE },
        { transient: { members: [user] } }
      )
    ]

    otherUserCustomerConversation = await factories.conversationFactory.create(
      { type: ConversationType.CUSTOMER },
      { transient: { members: [otherUser] } }
    )

    otherUserPrivateConversation = await factories.conversationFactory.create(
      { type: ConversationType.PRIVATE },
      { transient: { members: [otherUser] } }
    )

    setCurrentUser(user)
  })


  describe('Query GoodChat Profile', () => {
    it('fetches the profile of the currently logged in user', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getUserProfile {
            goodchatProfile {
              id
              externalId
              createdAt
              updatedAt
              externalId
              displayName
              permissions
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.goodchatProfile).to.exist
      expect(data.goodchatProfile.id).to.eq(user.id)
      expect(data.goodchatProfile.externalId).to.eq(user.externalId)
      expect(data.goodchatProfile.createdAt).to.eq(user.createdAt)
      expect(data.goodchatProfile.updatedAt).to.eq(user.updatedAt)
      expect(data.goodchatProfile.displayName).to.eq(user.displayName)
      expect(data.goodchatProfile.permissions).to.deep.eq(user.permissions)
    })

    describe('Nested relationships', () => {
      it('returns the conversations the user is a member of', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getUserProfile {
              goodchatProfile {
                id
                conversations {
                  id
                  staffs {
                    id
                  }
                }
              }
            }
          `
        })

        expect(errors).to.be.undefined

        const { conversations } = data.goodchatProfile;

        expect(conversations).to.be.an('array')
        expect(conversations.length).to.be.greaterThan(0)
        expect(conversations).to.have.lengthOf(userConversations.length)

        const expectedConversationIds = _.map(userConversations, 'id');

        for (const conv of conversations) {
          expect(expectedConversationIds).to.include(conv.id)
          expect(conv.staffs[0].id).to.eq(user.id)
        }
      })
    })
  });

  describe('Query Convversation.staffs', () => {
    it('returns the staff members which are in a conversation', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversation(id: ${otherUserPrivateConversation.id}) {
              id
              staffs {
                id,
                displayName,
                externalId
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined

      const { conversation } = data;

      expect(conversation).to.be.an('object')
      expect(conversation.staffs).to.have.lengthOf(1)
      expect(conversation.staffs[0].id).to.eq(otherUser.id)
    })

    it('returns the staff member\'s nested conversations that I am allowed to see', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getConversations {
            conversation(id: ${otherUserCustomerConversation.id}) {
              id
              staffs {
                id,
                displayName,
                externalId
                conversations {
                  id
                }
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined

      const { conversation } = data;

      expect(conversation).to.be.an('object')
      expect(conversation.staffs).to.have.lengthOf(1)
      expect(conversation.staffs[0].id).to.eq(otherUser.id)
      expect(conversation.staffs[0].conversations).to.have.lengthOf(1)

      const receivedIds = _.map(conversation.staffs[0].conversations, 'id');

      expect(receivedIds).not.to.include(otherUserPrivateConversation.id) // it's private
      expect(receivedIds).to.include(otherUserCustomerConversation.id) // it's customer chat so I can see it
    })
  })
});
