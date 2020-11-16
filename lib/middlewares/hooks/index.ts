import Router             from '@koa/router'
import { GoodChatConfig } from '../../types';

/**
 * Creates all the necessary webhooks required by Smooch
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (config: GoodChatConfig) => {
  
  const router = new Router();


  return router.routes();
}
