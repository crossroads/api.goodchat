import { Factory }  from 'fishery'
import _            from 'lodash'
import faker        from 'faker'
import {
  SunshineContent,
  SunshineContentType,
  SunshineImageContent,
  SunshineTextContent,
} from '../../../lib/typings/sunshine'

/**
 * Creates a fake SunshineTextContent record
 *
 * @type {Factory<SunshineTextContent>}
 * @exports
 */
export const sunshineTextContentFactory = Factory.define<SunshineTextContent>(() => {
  return  {
    type: "text",
    text: faker.lorem.sentence(),
  }
});

/**
 * Creates a fake SunshineImageContent record
 *
 * @type {Factory<SunshineImageContent>}
 * @exports
 */
export const sunshineImageContentFactory = Factory.define<SunshineImageContent>(() => {
  return  {
    type: "image",
    mediaUrl: faker.image.imageUrl(),
    mediaType: "image/jpeg",
    mediaSize: faker.random.number({ min: 10000, max: 1000000 }),
    altText: faker.lorem.words(5)
  }
});

/**
 * Creates a fake SunshineContent record based on the type passed in transient params
 *
 * @type {Factory<SunshineContent>}
 * @exports
 */
export const sunshineContentFactory = Factory.define<SunshineContent, { contentType?: SunshineContentType }>((opts) => {
  const { contentType } = opts.transientParams;

  if (contentType === "image") {
    return sunshineImageContentFactory.build();
  }

  return sunshineTextContentFactory.build();
});

