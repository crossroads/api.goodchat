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
  onCreate(data => db.customer.create({ data: _.omit(data, 'id') }));

  const now = new Date();

  return {
    id: sequence,
    createdAt: now,
    updatedAt: now,
    externalId: null,
    sunshineUserId: faker.datatype.uuid(),
    displayName: faker.name.firstName(),
    email: faker.internet.email(),
    avatarUrl: faker.internet.avatar(),
    locale: 'en',
    metadata: {}
  }
});
