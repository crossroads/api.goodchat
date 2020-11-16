import Router             from '@koa/router'
import { GoodChatConfig } from '../../types';

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
