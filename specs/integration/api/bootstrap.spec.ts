import { expect }                 from 'chai'
import sinon                      from 'sinon'
import _                          from 'lodash'
import goodchat                   from '../../../index'
import * as logger                from '../../../lib/middlewares/logs'
import * as rescue                from '../../../lib/middlewares/rescue'
import * as i18n                  from '../../../lib/middlewares/i18n'
import * as webhooks              from '../../../lib/routes/webhooks'

describe('Bootstrap', () => {
  const boot = async () => {
    return await goodchat()
  }

  afterEach(() => sinon.restore());

  describe('Middlewares', () => {
    _.each({
      logger,
      rescue,
      i18n,
      webhooks
    }, (mw, name) => {
      context(`${name} middleware`, () => {
        let spy : sinon.SinonSpy

        beforeEach(() => { spy = sinon.spy(mw, 'default'); })
        afterEach(() => { spy.restore() })

        it(`initializes the middleware`, async () => {
          await boot();
          expect(spy.callCount).to.be.gte(1)
        });
      });
    });
  });
});
