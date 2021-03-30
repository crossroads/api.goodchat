import { throwNotFound, throwUnprocessable }  from "./errors"
import _                  from "lodash"

type RaiseFunc = (...args: any[]) => never

/**
 * Throws if a record is null
 *
 * @export
 * @template T
 * @param {T} record
 * @param {string} [msg='errors.not_found']
 * @returns {asserts}
 */
export function exists<T>(record: T, msg = 'errors.not_found') : asserts record {
  if (record === void 0 || record === null) {
    throwNotFound(msg, record);
  }
}

type PojoType = "undefined" | "boolean" | "number" | "string" | "symbol" | "object" | "array"

type PojoSchema<T> = { [key in keyof T]: PojoType[] }

/**
 * Returns true if obj matches the type
 *
 * @export
 * @param {unknown} obj
 * @param {PojoType} type
 * @returns {boolean}
 */
export function isType(obj: unknown, type: PojoType) : boolean {
  return ({
    "undefined":  _.isUndefined,
    "number":     _.isNumber,
    "integer":    _.isInteger,
    "boolean":    _.isBoolean,
    "string":     _.isString,
    "object":     _.isObject,
    "array":      _.isArray,
    "symbol":     _.isSymbol
  })[type](obj);
}

export type MiniSchema<T> = {
  validate(obj: unknown) : asserts obj is T,
  onError: (fn: RaiseFunc) => MiniSchema<T>
}

/**
 * Returns a mini schema validator :)
 *
 * @export
 * @param {PojoSchema} sch
 * @returns
 */
export function minischema<T>(sch: PojoSchema<T>) : MiniSchema<T> {
  let raise : RaiseFunc = () => throwUnprocessable();

  const out : MiniSchema<T> = {
    // --- calls the error handler if obj doesn't match the schema
    validate: (obj: any) => {
      _.each(sch, (types, prop) => {
        if (!_.has(obj, prop) || !_.find(types, (t) => isType(obj[prop], t))) {
          raise();
        }
      })
    },

    // --- overrides the default error handler
    onError: (fn) => {
      raise = fn;
      return out;
    }
  }

  return out;
}
