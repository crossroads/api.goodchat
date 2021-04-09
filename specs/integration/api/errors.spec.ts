import { expect }       from 'chai'
import { GoodchatApp }  from '../../../lib/typings/goodchat';
import {
  createAgent,
  createGoodchatServer,
  TestAgent
} from '../../spec_helpers/agent'

describe('API', () => {

  describe('Error handling', () => {
    let agent : TestAgent

    before(async () => {
      [, agent] = await createGoodchatServer()
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
