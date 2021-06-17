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
    integrationId: faker.datatype.uuid(),
    originalMessageId: faker.datatype.uuid(),
    originalMessageTimestamp: faker.date.recent().toISOString(),
    client: {
      type: "whatsapp",
      status: "active",
      integrationId: faker.datatype.uuid(),
      externalId: faker.datatype.uuid(),
      lastSeen:faker.date.recent().toISOString(),
      linkedAt: faker.date.recent().toISOString(),
      displayName: faker.internet.userName(),
      avatarUrl: faker.internet.avatar(),
      info: {},
    },
    device: {
      type: "android",
      guid: faker.datatype.uuid(),
      clientId: faker.datatype.uuid(),
      status: "active",
      integrationId:faker.datatype.uuid(),
      lastSeen: faker.date.recent().toISOString(),
      pushNotificationToken:faker.datatype.uuid()
    }
  }
});
