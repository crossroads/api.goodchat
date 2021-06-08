import _                       from "lodash"
import { throwUnprocessable }  from "../../utils/errors"
import db, { CollectionName }  from "../../db"

export type Pagination = {
  limit:    number
  after:    number
}

export type CollectionArgs = Partial<Pagination>

export type WhereClause = Record<string, any>

// ---------------------------
// Helpers
// ---------------------------

export const normalizePages = (args: CollectionArgs) : Pagination => {
  return {
    limit: _.clamp(args.limit || 25, 0, 100),
    after: _.clamp(args.after || 0, 0, Infinity)
  }
}

/**
 *
 * Creates a where clause to apply a cursor on a collection
 *
 */
export const cursorFilter = async (
  after: number,
  table: CollectionName,
  orderField : 'id' | 'updatedAt' | 'createdAt' = 'createdAt',
  order: 'desc' | 'asc' = 'asc'
) : Promise<Record<string, any>> => {
  if (after <= 0) {
    return {}; // no filter
  }

  const record = await (db[table] as any).findUnique({
    where: { id: after }
  })

  if (!record || !record[orderField]) {
    throwUnprocessable('errors.pagination.invalid_cursor')
  }

  return {
    [orderField]: {
      [order == 'desc' ? 'lt' : 'gt']: record[orderField]
    }
  }
}
