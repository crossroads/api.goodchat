import authService                               from '../services/auth_service'
import Koa                                       from 'koa'
import _                                         from 'lodash'
import { readBearer }                            from '../utils/http'
import { throwUnauthenticated, throwForbidden }  from '../utils/errors'
import compose                                   from 'koa-compose'
import rescue                                    from './rescue'
import { Listable }                              from '../typings/lang'
import {
  GoodChatConfig,
  KoaChatMiddleware,
  KoaChatContext,
  GoodChatPermissions
} from '../typings/goodchat'

/**
 * Creates an authentication middleware
 *
 * The middleware will:
 *  - return a 401 if it fails to authenticate a user
 *  - return a 403 if the user does not match the permissions passed as arg
 *
 * @export
 * @param {GoodChatConfig} config
 */
export default (permissions : Listable<GoodChatPermissions> = []) : KoaChatMiddleware => {
  const middleware : KoaChatMiddleware = async (ctx: KoaChatContext, next: Koa.Next) => {
    const token = readBearer(ctx);

    if (!token) throwUnauthenticated();

    const staff = await authService.authenticate(token);

    const allowed = _.chain([permissions])
      .flatten()
      .every(p => _.includes(staff.permissions, p))
      .value()

    if (!allowed) throwForbidden();

    ctx.state.staff = staff

    return next();
  };

  return compose([rescue(), middleware]);
};
