import { expect }                 from 'chai';
import { Test, SuperTest }        from 'supertest';
import goodchat                   from '..'
import { GoodChatAuthMode }       from '../lib/types';

describe('GoodChat', () => {
  let app = null;
  let agent : SuperTest<Test>;

  before((done) => {
    app = goodchat({
      smoochAppId:            'sample_app_id',
      smoochApiKeyId:         'sample_api_key_id',
      smoochApiKeySecret:     'sample_api_key_secret',
      goodchatHost:           'localhost:8000',
      authMode:               GoodChatAuthMode.NONE
    })

    agent = require('supertest-koa-agent')(app)
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