import db, { sql }  from "../db"
import _            from "lodash"

/**
 * Returns the number of unread messages of a user for a given conversation
 *
 * @export
 * @param {number} staffId
 * @param {number} conversationId
 * @returns {Promise<number>}
 */
export async function computeUnreadMessageCount(staffId: number, conversationId: number) : Promise<number> {
  const [{ count }] = await sql`
    WITH last_read_timestamps AS (
      SELECT rr."conversationId", m."createdAt" AS timestamp
        FROM "ReadReceipt" rr
        JOIN "Message" m ON m.id = rr."lastReadMessageId"
        WHERE (
          rr."userType" = 'STAFF' AND
          rr."userId" = ${staffId} AND
          rr."conversationId" = ${conversationId}
        )
    )
    SELECT count(m.id) FROM "Message" m
    LEFT JOIN last_read_timestamps AS lrt ON lrt."conversationId" = m."conversationId"
    WHERE m."conversationId" = ${conversationId}
      AND (m."createdAt" > lrt.timestamp OR lrt.timestamp IS NULL)
  `

  return count;
}

/**
 * Returns the total number of messages in a conversation
 *
 * @export
 * @param {number} conversationId
 * @returns {Promise<number>}
 */
export async function computeMessageCount(conversationId: number) : Promise<number> {
  const { _count } = await db.message.aggregate({
    where: {
      conversationId
    },
    _count: {
      id: true
    }
  })

  return _count.id
}
