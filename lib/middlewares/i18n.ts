import Koa                      from 'koa'
import _                        from 'lodash'
import { KoaChatContext }       from '../types'
import { parseAcceptLanguage }  from '../utils/http'
import * as i18nService         from '../services/i18n'

/**
 * Injects an i18n instance into the Koa context, and configures it to use the language specified by the header
 *
 * @export
 */
export default (options: Partial<i18n.ConfigurationOptions> = {}) => {
  return async (ctx : KoaChatContext, next: Koa.Next) => {
    const lang = parseAcceptLanguage(ctx.get('accept-language'), i18nService.supportedLanguages);

    ctx.i18n = i18nService.initialize(options);
    ctx.i18n.setLocale(lang);

    await next();
  }
}
