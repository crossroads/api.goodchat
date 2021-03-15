import { Factory }      from 'fishery'
import faker            from 'faker'
import _                from 'lodash'
import db               from '../../../lib/db'
import { Customer }     from '@prisma/client'


/**
 * Creates a fake Customer record
 * 
 * @type {Factory<Customer>}
 * @exports
 */
export const customerFactory = Factory.define<Customer>(({ sequence, onCreate }) => {
  onCreate(data => db.customer.create({ data }));

  return {
    id: sequence,
    createdAt: new Date(),
    externalId: null,
    sunshineUserId: faker.random.uuid(),
    displayName: faker.name.firstName(),
    email: faker.internet.email(),
    avatarUrl: faker.internet.avatar(),
    locale: 'en',
    metadata: {}
  }
});
