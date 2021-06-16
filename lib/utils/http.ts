import _    from 'lodash'
import Koa  from 'koa'

const DEFAULT_LANG = 'en';

/**
 * Parses the accept-language header, and returns the most appropriate supported language
 *
 * ```typescript
 *  parseAcceptLanguage('zh_tw;q=0.9, en;q=0.8', ['en', 'zh_tw']) // => 'zh_tw'
 * ```
 *
 * @export
 * @param {string} [input=""]
 * @param {string} [supportedLanguages=['en']]
 * @returns {string}
 */
export function parseAcceptLanguage(input = "", supportedLanguages = ['en']) : string {
  const rexp = /[a-z-_]+(;q=[0-9.]+)?/gi;

  const toDigit = (s: string) => Number(s.replace(/\D/g,'')) || 1;

  const lang = _.chain(input.match(rexp))
    .map(it => it.toLowerCase())
    .map(it => _.split(it, ';'))
    .compact()
    .filter(([code]) => _.includes(supportedLanguages, code))
    .map(([code, q = "1"]) => ({ code, q: toDigit(q) }))
    .orderBy(['q'], ['desc'])
    .first()
    .get('code')
    .value();

  return lang || DEFAULT_LANG;
}

/**
 * Adds `https://` at the beginning of a URL if it isn't already there
 *
 * @export
 * @param {string} endpoint
 * @param {string} [protocol='https']
 * @returns {string}
 */
export function prefixProtocol(endpoint : string, protocol = 'https') : string {
  const rexp = new RegExp(`^${protocol}://`);
  return rexp.test(endpoint) ? endpoint : `${protocol}://${endpoint}`;
}

/**
 * Returns the bearer token found in the headers, or null
 *
 * @export
 * @param {Koa.Context|Headers} ctx
 */
export function readBearer(ctx: Koa.Context) : string | null {
  return parseBearer(ctx.request.headers.authorization || "");
}

export function parseBearer(header: string) : string | null {
  if (!/Bearer [^\s]+/.test(header)) return null;
  return header.split(' ')[1];
}

/**
 * A few Koa helper function/middlewares
 */
export const KoaHelpers = {
  noop: (ctx: Koa.Context, next : Koa.Next) => next()
}
