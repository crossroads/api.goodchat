import { Factory }      from 'fishery'
import faker            from 'faker'
import _                from 'lodash'
import db               from '../../../lib/db'
import { Staff }        from '@prisma/client'


/**
 * Creates a fake Staff record
 * 
 * @type {Factory<Staff>}
 * @exports
 */
export const staffFactory = Factory.define<Staff>(({ sequence, onCreate }) => {
  onCreate(data => db.staff.create({ data }));

  return {
    id: sequence,
    externalId: String(sequence),
    displayName: faker.name.firstName(),
    metadata: {},
    permissions: [],
    updatedAt: new Date(),
    createdAt: new Date()
  }
});
