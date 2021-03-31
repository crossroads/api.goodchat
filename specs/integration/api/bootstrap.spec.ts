import { expect }                 from 'chai'
import sinon                      from 'sinon'
import _                          from 'lodash'
import goodchat                   from '../../../index'
import * as logger                from '../../../lib/middlewares/logs'
import * as rescue                from '../../../lib/middlewares/rescue'
import * as i18n                  from '../../../lib/middlewares/i18n'
import * as webhooks              from '../../../lib/routes/webhooks'
import { BLANK_CONFIG }           from '../../samples/config'

describe('Bootstrap', () => {
  const boot = async () => {
    return await goodchat(BLANK_CONFIG)
  }

  afterEach(() => sinon.restore());

  describe('Middlewares', () => {
    _.each({
      logger,
      rescue,
      i18n,
      webhooks
    }, (mw, name) => {
      it(`initializes the ${name} middleware`, async () => {
        const spy = sinon.spy(mw, 'default');
        await boot();
        expect(spy.callCount).to.eq(1);
      });
    });
  });
});
