import { throwNotFound } from "./errors";

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

