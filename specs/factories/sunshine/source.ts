import { Factory }  from 'fishery'
import _            from 'lodash'
import faker        from 'faker'
import {
  SunshineSource,
} from '../../../lib/typings/sunshine'

/**
 * Creates a fake SunshineSource record
 * 
 * @type {Factory<SunshineSource>}
 * @exports
 */
export const sunshineSourceFactory = Factory.define<SunshineSource>(() => {
  return  {
    type: "whatsapp",
    integrationId: faker.random.uuid(),
    originalMessageId: faker.random.uuid(),
    originalMessageTimestamp: faker.date.recent().toISOString(),
    client: {
      type: "whatsapp",
      status: "active",
      integrationId: faker.random.uuid(),
      externalId: faker.random.uuid(),
      lastSeen:faker.date.recent().toISOString(),
      linkedAt: faker.date.recent().toISOString(),
      displayName: faker.internet.userName(),
      avatarUrl: faker.internet.avatar(),
      info: {},
    },
    device: {
      type: "android",
      guid: faker.random.uuid(),
      clientId: faker.random.uuid(),
      status: "active",
      integrationId:faker.random.uuid(),
      lastSeen: faker.date.recent().toISOString(),
      pushNotificationToken:faker.random.uuid()
    }
  }
});
