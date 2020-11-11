import Router             from '@koa/router'
import { GoodChatConfig } from '../../types';

/**
 * 
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (config: GoodChatConfig) => {
  
  const router = new Router();


  return router.routes();
}