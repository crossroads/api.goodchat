import { Factory }  from 'fishery'
import _            from 'lodash'
import faker        from 'faker'
import {
  SunshineConversation,
  SunshineConversationShort
} from '../../../lib/typings/sunshine'

/**
 * Creates a fake SunshineConversationShort record
 *
 * @type {Factory<SunshineConversationShort>}
 * @exports
 */
export const sunshineConversationShortFactory = Factory.define<SunshineConversationShort>(() => {
  return {
    id:   "1",
    type: "personal"
  }
})

/**
 * Creates a fake SunshineConversation record
 *
 * @type {Factory<SunshineConversation>}
 * @exports
 */
export const sunshineConversationFactory = Factory.define<SunshineConversation>(() => {
  return {
    ...sunshineConversationShortFactory.build(),
    isDefault: true,
    displayName: faker.name.findName(),
    description: faker.name.title(),
    iconUrl: faker.internet.avatar(),
    metadata: {},
    businessLastRead: faker.date.recent().toISOString(),
    lastUpdatedAt: faker.date.recent().toISOString()
  }
})
