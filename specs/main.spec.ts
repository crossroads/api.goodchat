import { expect }                 from 'chai';
import Koa                        from 'koa';
import goodchat                   from '../index'
import { GoodChatAuthMode }       from '../lib/types';
import { createAgent, TestAgent } from './helpers/agent';

describe('GoodChat', () => {
  let app   : Koa
  let agent : TestAgent

  before((done) => {
    app = goodchat({
      smoochAppId:            'sample_app_id',
      smoochApiKeyId:         'sample_api_key_id',
      smoochApiKeySecret:     'sample_api_key_secret',
      goodchatHost:           'localhost:8000',
      authMode:               GoodChatAuthMode.NONE
    })

    agent = createAgent(app);
    done();
  });

  context('Unhandled routes', () => {
    it('returns a 404', async () => {
      const { body } = await agent
        .get('/i/dont/exist')
        .expect('Content-Type', /json/)
        .expect(404)
      
      expect(body.status).to.equal(404);
      expect(body.error).to.equal('Not Found');
    })
  })
})
