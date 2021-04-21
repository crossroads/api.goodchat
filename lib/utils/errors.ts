import * as i18nService   from '../services/i18n'
import { isPromise }      from './async'
import { I18n }           from 'i18n'
import _                  from 'lodash'
import { AnyFunc }        from '../typings/lang'
import axios              from 'axios'
import * as apolloErrors  from 'apollo-server-errors'

/**
 * Different kinds of errors GoodChat can throw
 *
 * @export
 * @enum {number}
 */
 export enum ErrorTypes {
  DEFAULT       = 'GoodChatError',
  NOT_FOUND     = 'NotFoundError',
  INTERNAL      = 'InternalError',
  DISABLED      = 'DisabledFeatureError',
  UNPROCESSABLE = 'UnprocessableEntityError',
  CONFLICT      = 'ConflictError',
  UNAUTHORIZED  = 'UnauthorizedError',
  FORBIDDEN     = 'ForbiddenError'
}

const typesPerStatus : Record<number, ErrorTypes> = {
  500:  ErrorTypes.INTERNAL,
  404:  ErrorTypes.NOT_FOUND,
  409:  ErrorTypes.CONFLICT,
  422:  ErrorTypes.UNPROCESSABLE,
  401:  ErrorTypes.UNAUTHORIZED,
  403:  ErrorTypes.FORBIDDEN
}

function guessErrorType(status: number) : ErrorTypes {
  return typesPerStatus[status] || ErrorTypes.DEFAULT;
}

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
    this.type     = type || guessErrorType(status)
    this.details  = details;
  }

  translatedMessage(lang: string = i18nService.defaultLanguage) {
    this.i18n.setLocale(lang);
    return this.i18n.__(this.message);
  }

  serialize(lang: string = i18nService.defaultLanguage) {
    return {
      error:    this.translatedMessage(lang),
      status:   this.status,
      type:     this.type
    }
  }

  toApolloError(lang: string = i18nService.defaultLanguage) {
    const message = this.translatedMessage(lang);

    const Klass = ({
      401: apolloErrors.AuthenticationError,
      403: apolloErrors.ForbiddenError,
      422: apolloErrors.UserInputError
    })[this.status] || apolloErrors.ApolloError;

    const error = new Klass(message);

    error.extensions = { ...error.extensions, exception: this.serialize(lang) };

    return error;
  }
}

/**
 * Wraps an error of unknown kind into a GoodchatError
 *
 * @export
 * @param {unknown} err
 * @returns {GoodchatError}
 */
export function wrapError(err: unknown) : GoodchatError {
  if (err instanceof GoodchatError) {
    return err;
  }

  if (axios.isAxiosError(err)) {
    return new GoodchatError(
      err.message,
      Number(err.response?.status || 500),
      err.response?.data || {}
    )
  }


  const status  = Number(_.get(err, 'status',   500));
  const message = String(_.get(err, 'message',  'errors.unknown'));

  return new GoodchatError(message, status, err);
}

/**
 * Wraps a function to make sure any thrown error gets transformed into a GoodChatError
 *
 * @export
 * @template T
 * @param {T} fn
 * @returns {T}
 */
export function unsafe<T extends AnyFunc>(fn : T) : T {
  const wrapped = ((...args: any[]) => {
    try {
      const ret = fn(...args);
      return isPromise(ret) ? ret.catch(e => Promise.reject(wrapError(e))) : ret;
    } catch (e) {
      /* istanbul ignore next */
      throw wrapError(e);
    }
  }) as T

  return wrapped
}

// ---- Helpers

export function throwNotFound(message = 'errors.not_found', details = {}) : never {
  throw new GoodchatError(message, 404, details, ErrorTypes.NOT_FOUND);
}

export function throwInternal(message = 'errors.unknown', details = {}) : never {
  throw new GoodchatError(message, 500, details, ErrorTypes.INTERNAL);
}

export function throwDisabled(message = 'errors.disabled', details = {}) : never {
  throw new GoodchatError(message, 409, details, ErrorTypes.DISABLED);
}

export function throwUnprocessable(message = 'errors.unprocessable', details = {}) : never {
  throw new GoodchatError(message, 422, details, ErrorTypes.UNPROCESSABLE);
}

export function throwUnauthenticated(message = 'errors.unauthenticated', details = {}) : never {
  throw new GoodchatError(message, 401, details, ErrorTypes.UNAUTHORIZED);
}

export function throwForbidden(message = 'errors.forbidden', details = {}) : never {
  throw new GoodchatError(message, 403, details, ErrorTypes.FORBIDDEN);
}

export const panic = throwInternal;
