import { Factory }                  from 'fishery'
import _                            from 'lodash'
import faker                        from 'faker'
import * as factories               from '..'
import {
  SunshineMessage,
  SunshineUser
} from '../../../lib/typings/sunshine'

type SunshineMessageFactoryParams = {
  contentType?: "image" | "text",
  user?: SunshineUser
}

/**
 * Creates a fake SunshineMessage record
 * 
 * User and content types can be specified as transient params
 * 
 * @type {Factory<SunshineMessage, SunshineMessageFactoryParams>}
 * @exports
 */
export const sunshineMessageFactory = Factory.define<SunshineMessage, SunshineMessageFactoryParams>((opts) => {
  const { contentType } = opts.transientParams;

  const user = opts.transientParams.user || factories.sunshineUserFactory.build();

  return  {
    id: faker.random.uuid(),
    received: faker.date.recent().toISOString(),
    author: {
      userId: user.id,
      type: "business",
      user: user
    },
    content: factories.sunshineContentFactory.build({}, { transient: { contentType } }),
    source: {
      integrationId: faker.random.uuid(),
      originalMessageId: faker.random.uuid(),
      originalMessageTimestamp: faker.date.recent().toISOString(),
      type: "whatsapp"
    }
  }
})

