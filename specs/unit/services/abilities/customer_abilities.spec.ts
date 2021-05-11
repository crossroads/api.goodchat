import { GoodChatPermissions }   from '../../../../lib/typings/goodchat'
import { Customer, Staff }       from '@prisma/client'
import * as factories            from '../../../factories'
import { abilities }             from '../../../../lib/services/abilities'
import { expect }                from 'chai'
import _                         from 'lodash'

describe('Services/Abilities/Customer', () => {
  let admin         : Staff
  let customerStaff : Staff
  let baseStaff     : Staff
  let customers     : Customer[]

  beforeEach(async () => {
    // Create 3 users, one for each permission
    admin = await factories.staffFactory.create({ permissions: [GoodChatPermissions.ADMIN] });
    customerStaff = await factories.staffFactory.create({ permissions: [GoodChatPermissions.CHAT_CUSTOMER] });
    baseStaff = await factories.staffFactory.create({ permissions: [] });

    // Populate the database with some customers
    customers = await Promise.all(
      _.times(5, (t) => factories.customerFactory.create({ externalId: String(t) }))
    )
  });

  describe("#getCustomer", () => {
    _.each({
      "admin": () => admin,
      "staff with customer permission": () => customerStaff
    }, (getUser, type) => {
      context(`As an ${type}`, () => {

        it('allows me to list customers', async () => {
          const result = await abilities(getUser()).getCustomers();

          expect(result.length).to.eq(5);
          expect(_.map(result, 'id')).to.have.members(
            _.map(customers, 'id')
          )
        })

        it('allows me to filter customers by ID', async () => {
          const result = await abilities(getUser()).getCustomers({ id: customers[0].id });

          expect(result.length).to.eq(1);
          expect(result[0]).to.deep.equal(customers[0])
        })

        it('allows me to filter customers by externalId', async () => {
          const result = await abilities(getUser()).getCustomers({ externalId: customers[0].externalId });

          expect(result.length).to.eq(1);
          expect(result[0]).to.deep.equal(customers[0])
        })
      })
    })

    context('As a staff member with no permissions', () => {
      it('doesnt return any customer', async () => {
        const result = await abilities(baseStaff).getCustomers();
        expect(result.length).to.eq(0);
      })
    })
  })

  describe("#getCustomerById", () => {
    _.each({
      "admin": () => admin,
      "staff with customer permission": () => customerStaff
    }, (getUser, type) => {
      context(`As an ${type}`, () => {

        it('allows me to fetch a customer by ID', async () => {
          const result = await abilities(getUser()).getCustomerById(customers[0].id);
          expect(result).to.deep.equal(customers[0])
        })
      })
    })

    context('As a staff member with no permissions', () => {
      it('doesnt return any customer', async () => {
        const result = await abilities(baseStaff).getCustomerById(customers[0].id);
        expect(result).to.eq(null);
      })
    })
  })
});
