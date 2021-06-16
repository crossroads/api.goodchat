import { Factory }  from 'fishery'
import _            from 'lodash'
import faker        from 'faker'
import {
  SunshineUser,
  SunshineUserProfile
} from '../../../lib/typings/sunshine'

/**
 * Creates a fake SunshineUserProfile record
 *
 * @type {Factory<SunshineUserProfile>}
 * @exports
 */
export const sunshineProfileFactory = Factory.define<SunshineUserProfile>(() => {
  const firstName = faker.name.firstName();
  const lastName  = faker.name.lastName();

  return {
    givenName:  firstName,
    surname:    lastName,
    email:      faker.internet.email(firstName, lastName, 'hey.com'),
    avatarUrl:  faker.internet.avatar(),
    locale:     'en'
  }
});


/**
 * Creates a fake SunshineUser record
 *
 * @type {Factory<SunshineUser>}
 * @exports
 */
export const sunshineUserFactory = Factory.define<SunshineUser>(() => {
  return {
    id: faker.datatype.uuid(),
    externalId: null,
    signedUpAt: faker.date.past().toISOString(),
    profile: sunshineProfileFactory.build(),
    metadata: {}
  }
});

