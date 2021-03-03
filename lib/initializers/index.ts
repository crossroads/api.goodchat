import { GoodChatConfig } from 'lib/typings/goodchat';
import _                  from 'lodash'
import requireDir         from 'require-dir'
import { each }           from '../utils/async'

/**
 * Requires all the initializers of the current folder and calls them with the Goodchat config
 *
 * @export
 * @param {GoodChatConfig} config
 */
export async function boot(config: GoodChatConfig) {
  const initializers = _.omit(requireDir('.'), ['index'])

  await each(initializers, (mod: { default: Function }, key: string) => {
    const { default: initializer } = mod
    return initializer(config)
  });
}
