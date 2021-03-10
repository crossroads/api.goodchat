import Router             from '@koa/router'
import { GoodChatConfig } from '../../../lib/typings/goodchat';

/**
 * Creates all the rest endpoints to read/write on conversations
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (config: GoodChatConfig) => {
  
  const router = new Router();


  return router.routes();
}
