import { GoodchatError } from '../../../lib/utils/errors'
import { BLANK_CONFIG }  from '../../samples/config'
import authService       from '../../../lib/services/auth_service'
import * as factories    from '../../factories'
import { expect }        from 'chai'
import nock              from 'nock'
import db                from '../../../lib/db'
import {
  AuthPayload,
  GoodChatAuthMode,
  GoodChatPermissions
}  from '../../../lib/typings/goodchat'

const FAKE_HOST     = 'https://fake.biz'
const FAKE_ENDPOINT = '/endpoint'
const FAKE_URL      = `${FAKE_HOST}${FAKE_ENDPOINT}`

describe('Services/auth', () => {
  let apiCall : nock.Scope;

  afterEach(() => {
    nock.cleanAll();
  })

  describe('Webhook authentication', () => {
    const subject = authService({
      ...BLANK_CONFIG,
      auth: {
        mode: GoodChatAuthMode.WEBHOOK,
        url: FAKE_URL
      }
    })

    context('if the auth server returns a 200', () => {

      context('with a bad payload', () => {
        beforeEach(() => {
          apiCall = nock(FAKE_HOST).post(FAKE_ENDPOINT).reply(200, {
            'bad': 'schema'
          })
        })

        it('throws an unprocessable 422 error', async () => {
          const e = await expect(subject.authenticate("sometoken")).to.be.rejectedWith(GoodchatError)
          expect(apiCall.isDone()).to.be.true
          expect(e.serialize()).to.deep.eq({
            "error": "Unprocessable Entity",
            "status": 422,
            "type": "UnprocessableEntityError"
          })
        })
      })

      context('with a well formatted payload', () => {
        const payload : AuthPayload = {
          userId: 123,
          displayName: 'Steve',
          permissions: [GoodChatPermissions.CHAT_CUSTOMER]
        }

        beforeEach(() => {
          apiCall = nock(FAKE_HOST).post(FAKE_ENDPOINT).reply(200, payload)
        })

        it('creates a staff member', async () => {
          expect(await db.staff.count()).to.eq(0)
          await subject.authenticate("sometoken");
          expect(await db.staff.count()).to.eq(1)
          expect(apiCall.isDone()).to.be.true
        })

        it('sets the externalId of the staff record', async () => {
          await subject.authenticate("sometoken")

          expect(await db.staff.count()).to.eq(1)

          const staff = await db.staff.findFirst();

          expect(staff.externalId).to.eq(String(payload.userId))
          expect(apiCall.isDone()).to.be.true
        })

        it('sets the display name of the staff record', async () => {
          await subject.authenticate("sometoken")

          const staff = await db.staff.findFirst({ where: { externalId: String(payload.userId) }});

          expect(staff.displayName).to.eq(String(payload.displayName));
          expect(apiCall.isDone()).to.be.true
        })

        it('sets staff member\'s permissions', async () => {
          await subject.authenticate("sometoken")

          const staff = await db.staff.findFirst({ where: { externalId: String(payload.userId) }});

          expect(staff.permissions).to.deep.eq(payload.permissions);
          expect(apiCall.isDone()).to.be.true
        })

        context('if the staff member already exists', () => {
          let staffId : number

          const getStaff = async () => db.staff.findUnique({ where: { id: staffId }})

          beforeEach(async () => {
            staffId = (await factories.staffFactory.create({
              displayName: 'Stephen',
              externalId: String(payload.userId),
              permissions: []
            })).id
          });

          it('updates the displayName', async () => {
            expect((await getStaff()).displayName).to.eq('Stephen')
            await subject.authenticate("sometoken")
            expect((await getStaff()).displayName).to.eq('Steve')
          })

          it('updates the permissions', async () => {
            expect((await getStaff()).permissions).to.deep.eq([])
            await subject.authenticate("sometoken")
            expect((await getStaff()).permissions).to.deep.eq([GoodChatPermissions.CHAT_CUSTOMER])
          })
        })

      })
    })

    context('if the auth server returns a 403', () => {
      beforeEach(() => {
        apiCall = nock(FAKE_HOST).post(FAKE_ENDPOINT).reply(403);
      })

      it('throws a forbidden error', async () => {
        const e = await expect(subject.authenticate("sometoken")).to.be.rejectedWith(GoodchatError)
        expect(e.status).to.eq(403)
        expect(apiCall.isDone()).to.be.true
      })
    })

    context('if any error occurs', () => {
      beforeEach(() => {
        apiCall = nock(FAKE_HOST).post(FAKE_ENDPOINT).replyWithError('boom!')
      })

      it('throws a GoodChatError', async () => {
        await expect(subject.authenticate("sometoken")).to.be.rejectedWith(GoodchatError, 'boom!')
        expect(apiCall.isDone()).to.be.true
      })
    })
  })
});
