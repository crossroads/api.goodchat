import { expect }                 from 'chai'
import sinon                      from 'sinon'
import _                          from 'lodash'
import goodchat                   from '../../../index'
import * as logger                from '../../../lib/middlewares/logs'
import * as rescue                from '../../../lib/middlewares/rescue'
import * as i18n                  from '../../../lib/middlewares/i18n'
import * as webhooks              from '../../../lib/middlewares/webhooks'
import * as authentication        from '../../../lib/middlewares/authentication'
import * as rest                  from '../../../lib/middlewares/rest'
import * as subscriptions         from '../../../lib/subscriptions'
import { GoodChatAuthMode }       from '../../../lib/types';

describe('Bootstrap', () => {
  const boot = async () => {
    return await goodchat({
      smoochAppId:            'sample_app_id',
      smoochApiKeyId:         'sample_api_key_id',
      smoochApiKeySecret:     'sample_api_key_secret',
      goodchatHost:           'localhost:8000',
      authMode:               GoodChatAuthMode.NONE
    })
  }

  afterEach(() => sinon.restore());

  describe('Middlewares', () => {
    _.each({
      logger,
      rescue,
      i18n,
      webhooks,
      rest,
      authentication
    }, (mw, name) => {
      it(`initializes the ${name} middleware`, async () => {
        const spy = sinon.spy(mw, 'default');
        await boot();
        expect(spy.callCount).to.eq(1);
      });
    });
  });

  describe('Modules', () => {
    it('starts up the subscription module', async () => {
      const spy = sinon.spy(subscriptions, 'default');
      await boot();
      expect(spy.callCount).to.eq(1);
    })
  })
});
