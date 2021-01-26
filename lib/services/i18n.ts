import _                        from 'lodash'
import i18n, { I18n }           from 'i18n'

const catalog = {
  zh_tw:  require('../../locales/zh_tw.json'),
  en:     require('../../locales/en.json'),
}

export const defaultLanguage = 'en';

export const supportedLanguages = _.keys(catalog);

/**
 * Instanciates a pre-configured I18n object (node-i18n)
 *
 * @export
 * @param {Partial<i18n.ConfigurationOptions>} [options={}]
 * @returns {I18n}
 */
export function initialize(options : Partial<i18n.ConfigurationOptions> = {}) : I18n {
  const service = new i18n.I18n();

  service.configure({
    objectNotation:   true,
    defaultLocale:    'en',
    extension:        '.json',
    locales:          supportedLanguages,
    staticCatalog:    catalog,
    ...options
  })

  return service;
}
