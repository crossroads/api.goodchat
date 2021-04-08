import sinon                   from 'sinon'
import { Staff }               from "@prisma/client";

const authServiceMod = require('../../lib/services/auth_service');

let authServiceStub     : sinon.SinonStub

export function setCurrentUser(staff: Staff) {
  authServiceStub = sinon.stub(authServiceMod, 'default').returns({
    authenticate: sinon.stub().returns(Promise.resolve(staff)),
    authenticateHeaders: sinon.stub().returns(Promise.resolve(staff))
  });
}

export function clearCurrentUser() {
  if (authServiceStub) {
    authServiceStub.restore();
    authServiceStub = null;
  }
}
