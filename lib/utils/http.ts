import _ from 'lodash'

const DEFAULT_LANG = 'en';

export function parseAcceptLanguage(input = "", supportedLanguages = ['en']) : string {
  const rexp = /[a-z-_]+(;q=[0-9\.]+)?/gi;

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

export function prefixProtocol(endpoint : string, protocol : string = 'https') : string {
  const rexp = new RegExp(`^${protocol}://`);
  return rexp.test(endpoint) ? endpoint : `${protocol}://${endpoint}`;
}
