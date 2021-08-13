import { Factory }  from 'fishery'
import { Tag }      from '@prisma/client'
import faker        from 'faker'
import db           from '../../../lib/db'
import _            from 'lodash'

/**
 * Creates a fake Tag record
 *
 * @type {Factory<Message>}
 * @exports
 */
export const tagFactory = Factory.define<Tag>(({ sequence, onCreate }) => {
  onCreate(async (data) => {
    return db.tag.upsert({
      where: {
        name: data.name
      },
      update: {},
      create: {
        name: data.name,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    })
  });

  const date = new Date();

  return {
    id: sequence,
    createdAt: date,
    updatedAt: date,
    name: faker.random.word()
  }
});
