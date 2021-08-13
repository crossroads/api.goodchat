import { clearCurrentUser, setCurrentUser }        from '../../../spec_helpers/fake_auth'
import { ApolloServerTestClient }                  from 'apollo-server-testing'
import { createGoodchatServer }                    from '../../../spec_helpers/agent'
import { GoodChatPermissions }                     from '../../../../lib/typings/goodchat'
import * as factories                              from '../../../factories'
import { Tag, Staff }                              from '@prisma/client'
import { expect }                                  from 'chai'
import { gql }                                     from 'apollo-server-koa'
import _                                           from 'lodash'

describe('GraphQL Tags Query', () => {
  let gqlAgent : ApolloServerTestClient
  let tags : Tag[]

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    tags =  await factories.tagFactory.createList(3)
  })

  afterEach(() => clearCurrentUser())

  describe('Listing', () => {
    let admin : Staff
    let baseStaff : Staff
    let customerStaff : Staff

    beforeEach(async () => {
      admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
      customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] })
      baseStaff = await factories.staffFactory.create({ permissions: [] })
    })

    context('As an admin', () => {

      beforeEach(() => setCurrentUser(admin))

      it('allows me to list all tags', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getTags {
              tags {
                id
                name
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.tags).to.be.of.length(3)
        expect(_.map(data.tags, 'name')).to.include.members(
          _.map(tags, 'name')
        )
      })
    });

    context('As an customer staff', () => {

      beforeEach(() => setCurrentUser(customerStaff))

      it('allows me to list all tags', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getTags {
              tags {
                id
                name
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.tags).to.be.of.length(3)
        expect(_.map(data.tags, 'name')).to.include.members(
          _.map(tags, 'name')
        )
      })
    });

    context('As a normal staff', () => {

      beforeEach(() => setCurrentUser(baseStaff))

      it('allows me to list all tags', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getTags {
              tags {
                id
                name
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.tags).to.be.of.length(3)
        expect(_.map(data.tags, 'name')).to.include.members(
          _.map(tags, 'name')
        )
      })
    });
  })
});
