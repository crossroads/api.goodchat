import Koa                      from 'koa'
import _                        from 'lodash'
import { KoaChatContext }       from '../types'
import { parseAcceptLanguage }  from '../utils/http'
import * as i18nService         from '../services/i18n'

/**
 * Ensures a well formated error is returned when either of the following happens
 *  - No route was found
 *  - The route raised an error
 *
 * @export
 */
export default (options: Partial<i18n.ConfigurationOptions> = {}) => {
  return (ctx : KoaChatContext, next: Koa.Next) => {
    const lang = parseAcceptLanguage(ctx.get('accept-language'), i18nService.supportedLanguages);

    ctx.i18n = i18nService.initialize(options);
    ctx.i18n.setLocale(lang);

    next();
  }
}
