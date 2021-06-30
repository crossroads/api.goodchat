import { clearCurrentUser, setCurrentUser } from '../../../spec_helpers/fake_auth'
import { Staff, ConversationType }          from '@prisma/client'
import { ApolloServerTestClient }           from 'apollo-server-testing'
import { createGoodchatServer }             from '../../../spec_helpers/agent'
import { GoodChatPermissions }              from '../../../../lib/typings/goodchat'
import * as factories                       from '../../../factories'
import { expect }                           from 'chai'
import { gql }                              from 'apollo-server-koa'
import db                                   from '../../../../lib/db'
import _                                    from 'lodash'


describe('GraphQL CreateConversation mutation', () => {
  let gqlAgent              : ApolloServerTestClient

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  afterEach(() => {
    clearCurrentUser()
  })

  _.each({
    "admin permissions": [GoodChatPermissions.ADMIN],
    "customer permissions": [GoodChatPermissions.CHAT_CUSTOMER],
    "no permissions": []
  }, (permissions, desc) => {

    context(`As a staff member with ${desc}`, () => {
      let staff : Staff
      let otherStaff : Staff
      let otherStaff2 : Staff

      beforeEach(async () => {
        staff = await factories.staffFactory.create({ permissions })
        otherStaff = await factories.staffFactory.create()
        otherStaff2 = await factories.staffFactory.create()

        setCurrentUser(staff);
      })

      _.each([
        ConversationType.PRIVATE,
        ConversationType.PUBLIC
      ], type => {
        it(`creates a ${type} chat successfully`, async () => {
          expect(await db.conversation.count()).to.eq(0)

          const { errors, data } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation CreateConversation {
                createConversation(memberIds: [${otherStaff.id}], type: ${type}) {
                  id
                  type
                  customerId
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(await db.conversation.count()).to.eq(1)

          const { createConversation : output } = data;

          expect(output).to.have.property('id')
          expect(output).to.have.property('type', type)
          expect(output).to.have.property('customerId', null)
        })

        it(`adds the correct members to the new ${type} chat`, async () => {
          expect(await db.conversation.count()).to.eq(0)

          const memberIds = [otherStaff.id, otherStaff2.id]

          const { errors, data } : any = await gqlAgent.mutate({
            variables: { memberIds },
            mutation: gql`
              mutation CreateConversation($memberIds: [Int!]!) {
                createConversation(memberIds: $memberIds, type: ${type}) {
                  id
                  type
                  staffs {
                    id
                  }
                }
              }
            `
          })
          expect(errors).to.be.undefined

          const ids = _.map(data.createConversation.staffs, 'id');

          expect(ids).to.have.lengthOf(3)
          expect(ids).to.include(staff.id)
          expect(ids).to.include(otherStaff.id)
          expect(ids).to.include(otherStaff2.id)
        })

        it(`fails to create a ${type} chat with no other members`, async () => {
          expect(await db.conversation.count()).to.eq(0)

          const { errors } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation CreateConversation {
                createConversation(memberIds: [], type: ${type}) {
                  id
                  type
                  staffs {
                    id
                  }
                }
              }
            `
          })

          expect(await db.conversation.count()).to.eq(0)
          expect(errors).to.exist

          const { extensions } = errors[0];

          expect(extensions).to.have.property('code', 'BAD_USER_INPUT')
          expect(extensions.exception).to.deep.equal({
            error: 'Cannot create an empty conversation',
            status: 422,
            type: 'UnprocessableEntityError'
          })
        })

        it(`fails to create a ${type} chat setting just myself as the other member`, async () => {
          expect(await db.conversation.count()).to.eq(0)

          const { errors } : any = await gqlAgent.mutate({
            mutation: gql`
              mutation CreateConversation {
                createConversation(memberIds: [${staff.id}], type: ${type}) {
                  id
                  type
                  staffs {
                    id
                  }
                }
              }
            `
          })

          expect(await db.conversation.count()).to.eq(0)
          expect(errors).to.exist

          const { extensions } = errors[0];

          expect(extensions).to.have.property('code', 'BAD_USER_INPUT')
          expect(extensions.exception).to.deep.equal({
            error: 'Cannot create an empty conversation',
            status: 422,
            type: 'UnprocessableEntityError'
          })
        })
      });

      it('fails to create a CUSTOMER chat', async () => {
        expect(await db.conversation.count()).to.eq(0)

        const { errors } : any = await gqlAgent.mutate({
          mutation: gql`
            mutation CreateConversation {
              createConversation(memberIds: [${staff.id}], type: CUSTOMER) {
                id
                type
                staffs {
                  id
                }
              }
            }
          `
        })

        expect(await db.conversation.count()).to.eq(0)
        expect(errors).to.exist

        const { extensions } = errors[0];

        expect(extensions).to.have.property('code', 'FORBIDDEN')
        expect(extensions.exception).to.deep.equal({
          error: 'Customer conversations cannot be created',
          status: 403,
          type: 'ForbiddenError'
        })
      })
    });
  });
});
