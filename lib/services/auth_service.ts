import { throwDisabled, throwUnprocessable, unsafe }  from "../utils/errors"
import { MiniSchema, minischema }                     from "../utils/assertions"
import { Staff }                                      from "@prisma/client"
import axios                                          from "axios"
import db                                             from "../db"
import _                                              from "lodash"
import { parseBearer }                                from "../utils/http"
import {
  GoodChatAuthMode,
  GoodChatConfig,
  AuthPayload
} from "../typings/goodchat"

export default function (cfg: GoodChatConfig) {

  const schema : MiniSchema<AuthPayload> = minischema({
    "displayName" :   ["string"],
    "permissions" :   ["array"],
    "userId"      :   ["string", "number"]
  }).onError(() => throwUnprocessable())

  const resolveStaff = async (payload: AuthPayload) : Promise<Staff> => {
    return await db.staff.upsert({
      where: { externalId: String(payload.userId) },
      update: _.pick(payload, 'displayName', 'permissions'),
      create: {
        displayName: payload.displayName,
        permissions: payload.permissions,
        externalId: String(payload.userId),
        metadata: {},
      }
    });
  }

  const authenticate = unsafe(async (token: string) : Promise<Staff> => {

    if (cfg.auth.mode === GoodChatAuthMode.WEBHOOK) {
      /*
        === Webhook authentication

        We forward the token to the auth server, which should return us a payload with:
          - the user id
          - the permissions
          - a display name
      */
      const { url } = cfg.auth;
      const method  = 'POST';
      const headers = { 'Authorization': `Bearer ${token}` };

      const res     = await axios({ method, url, headers })
      const payload : unknown = res.data;

      schema.validate(payload);

      return resolveStaff(payload);
    }

    throwDisabled('errors.authentication.disabled')
  })

  const authenticateHeaders = <O extends Record<string, any>>(headers: O) => {
    const bearer = _.get(headers, 'authorization') || _.get(headers, 'Authorization', '');
    return authenticate(parseBearer(bearer) || '');
  }

  return { authenticate, authenticateHeaders }
}
