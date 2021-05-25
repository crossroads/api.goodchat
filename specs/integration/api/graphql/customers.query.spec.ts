import { expect }                                             from 'chai'
import * as factories                                         from '../../../factories'
import { ApolloServerTestClient }                             from 'apollo-server-testing'
import { createGoodchatServer }                               from '../../../spec_helpers/agent'
import { gql }                                                from 'apollo-server-koa'
import _                                                      from 'lodash'
import { Conversation, ConversationType, Customer, Staff }    from '@prisma/client'
import { clearCurrentUser, setCurrentUser }                   from '../../../spec_helpers/fake_auth'
import { GoodChatPermissions }                                from '../../../../lib/typings/goodchat'
import { map }                                                from '../../../../lib/utils/async'


describe('GraphQL Customers Query', () => {
  let gqlAgent : ApolloServerTestClient
  let conversations : Conversation[]
  let customers : Customer[]

  before(async () => {
    [,, gqlAgent] = await createGoodchatServer()
  });

  beforeEach(async () => {
    customers = await map(_.range(10), i => factories.customerFactory.create({ externalId: 'eid' + i }));
    conversations = await map(customers, c => factories.conversationFactory.create({ type: ConversationType.CUSTOMER, customerId: c.id }));
  })

  afterEach(() => clearCurrentUser())

  describe('Pagination', () => {
    beforeEach(async () => {
      setCurrentUser(
        await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
      )
    })

    it('only returns the number of records specified by limit', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getCustomers {
            customers(limit: 4) {
              id
              email
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.customers).to.have.lengthOf(4);
      expect(_.map(data.customers, 'id')).to.deep.equal(
        _.map(customers.slice(0, 4), 'id')
      )
    })

    it('returns the second page using an offset', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getCustomers {
            customers(limit: 4, offset: 4) {
              id
              email
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.customers).to.have.lengthOf(4);
      expect(_.map(data.customers, 'id')).to.deep.equal(
        _.map(customers.slice(4, 8), 'id')
      )
    })
  })

  describe('Filtering', () => {
    beforeEach(async () => {
      setCurrentUser(
        await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
      )
    })

    context('by id', () => {
      it('should return customers with an id that matches the subset', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getCustomers {
              customers(id: [${customers[0].id}, ${customers[2].id}]) {
                id
                email
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.customers).to.be.of.length(2)
        expect(data.customers[0].id).to.eq(customers[0].id)
        expect(data.customers[0].email).to.eq(customers[0].email)
        expect(data.customers[1].id).to.eq(customers[2].id)
        expect(data.customers[1].email).to.eq(customers[2].email)
      })
    })

    context('by external id', () => {
      it('should return customers with an externalId that matches the subset', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getCustomers {
              customers(externalId: ["${customers[0].externalId}", "${customers[2].externalId}"]) {
                id
                externalId
                email
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.customers).to.be.of.length(2)
        expect(data.customers[0].id).to.eq(customers[0].id)
        expect(data.customers[0].externalId).to.eq(customers[0].externalId)
        expect(data.customers[0].email).to.eq(customers[0].email)
        expect(data.customers[1].id).to.eq(customers[2].id)
        expect(data.customers[1].externalId).to.eq(customers[2].externalId)
        expect(data.customers[1].email).to.eq(customers[2].email)
      })
    })

    context('by id and externalId', () => {
      it('should return customers with an externalId that matches the subset', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getCustomers {
              customers(
                id: [${customers[0].id}]
                externalId: ["${customers[0].externalId}", "${customers[2].externalId}"]
              ) {
                id
                externalId
                email
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.customers).to.be.of.length(1)
        expect(data.customers[0].id).to.eq(customers[0].id)
        expect(data.customers[0].externalId).to.eq(customers[0].externalId)
        expect(data.customers[0].email).to.eq(customers[0].email)
      })
    })
  })

  describe('Nested Relationships', () => {
    beforeEach(async () => {
      setCurrentUser(
        await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
      )
    })

    it('includes the conversations of the customer', async () => {
      const { data, errors } : any = await gqlAgent.query({
        query: gql`
          query getCustomers {
            customers(limit: 2) {
              id
              conversations {
                id
              }
            }
          }
        `
      })

      expect(errors).to.be.undefined
      expect(data.customers).to.be.of.length(2)
      expect(data.customers[0].id).to.eq(customers[0].id)
      expect(data.customers[0].conversations[0].id).to.eq(conversations[0].id)
      expect(data.customers[1].id).to.eq(customers[1].id)
      expect(data.customers[1].conversations[0].id).to.eq(conversations[1].id)
    })
  })

  describe('Reading customers', () => {
    let admin : Staff
    let baseStaff : Staff
    let customerStaff : Staff

    beforeEach(async () => {
      admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] })
      customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] })
      baseStaff = await factories.staffFactory.create({ permissions: [] })
    })

    _.each({
      "an admin": () => admin,
      "a customer staff": () => customerStaff
    }, (getStaff, type) => {
      context(`As ${type}`, () => {

        beforeEach(() => setCurrentUser(getStaff()))

        it('allows me to read customers', async () => {
          const { data, errors } : any = await gqlAgent.query({
            query: gql`
              query getCustomers {
                customers(limit: 2) {
                  id
                  conversations {
                    id
                  }
                }
              }
            `
          })

          expect(errors).to.be.undefined
          expect(data.customers).to.be.of.length(2)
        })
      });
    });

    context('as a staff member without customer permissions', async () => {

      beforeEach(() => setCurrentUser(baseStaff))

      it('doesnt return any customers', async () => {
        const { data, errors } : any = await gqlAgent.query({
          query: gql`
            query getCustomers {
              customers(limit: 2) {
                id
                conversations {
                  id
                }
              }
            }
          `
        })

        expect(errors).to.be.undefined
        expect(data.customers).to.be.of.length(0)
      })
    })
  })
});
