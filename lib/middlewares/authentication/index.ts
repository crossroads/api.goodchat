import Router             from '@koa/router'
import { GoodChatAuthMode, GoodChatConfig } from '../../../lib/typings/goodchat';

/**
 * Adds an authentication middleware
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (config: GoodChatConfig) => {
  const router = new Router();

  if (config.authMode === GoodChatAuthMode.NONE) {
    router.routes();
  }

  // @TODO: Authentication

  return router.routes();
}
