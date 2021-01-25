import { I18n }           from 'i18n'
import * as i18nService   from '../services/i18n'
import _                  from 'lodash'

/**
 * Generic error class with serialization options
 *
 * @export
 * @class GoodchatError
 * @extends {Error}
 * @template T
 */
export class GoodchatError<T = any> extends Error {
  public status   : number
  public type     : string
  public details? : T

  private static i18n : I18n = i18nService.initialize()

  private get i18n() {
    return GoodchatError.i18n;
  }

  constructor(message: string, status: number, details?: T, type?: string) {
    super(message);

    this.status   = status
    this.type     = type || this.constructor.name
    this.details  = details;
  }

  serialize(lang: string = i18nService.defaultLanguage) {
    this.i18n.setLocale(lang);
    return {
      error:    this.i18n.__(this.message),
      status:   this.status,
      type:     this.type
    }
  }
}

export function wrapError(err: unknown) : GoodchatError {
  if (err instanceof GoodchatError) {
    return err;
  }

  const status  = Number(_.get(err, 'status',   500));
  const message = String(_.get(err, 'message',  'errors.unknown'));
  
  return new GoodchatError(message, status, err);
}
