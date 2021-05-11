import _ from "lodash"

export type Pagination = {
  limit:   number
  offset:  number
}

export type CollectionArgs = Partial<Pagination>

export type WhereClause = Record<string, any>

// ---------------------------
// Helpers
// ---------------------------

export const normalizePages = (args: CollectionArgs) : Pagination => {
  return {
    limit: _.clamp(args.limit || 25, 0, 100),
    offset: _.clamp(args.offset || 0, 0, 100),
  }
}
