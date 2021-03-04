import Router             from '@koa/router'
import { GoodChatConfig } from '../../../lib/typings/goodchat';

/**
 * Adds an authentication middleware
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (config: GoodChatConfig) => {
  
  const router = new Router();


  return router.routes();
}
