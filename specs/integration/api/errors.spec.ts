import { expect }                 from 'chai';
import goodchat                   from '../../../index'
import { createAgent, TestAgent } from '../../spec_helpers/agent';
import {
  GoodchatApp,
  GoodChatAuthMode
} from '../../../lib/types';

describe('API', () => {

  describe('Error handling', () => {
    let app   : GoodchatApp
    let agent : TestAgent

    before(async () => {
      [app] = await goodchat({
        smoochAppId:            'sample_app_id',
        smoochApiKeyId:         'sample_api_key_id',
        smoochApiKeySecret:     'sample_api_key_secret',
        goodchatHost:           'localhost:8000',
        authMode:               GoodChatAuthMode.NONE
      })

      agent = createAgent(app);
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
});
