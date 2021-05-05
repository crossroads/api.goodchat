import authService  from '../../lib/services/auth_service'
import { Staff }    from "@prisma/client";
import sinon        from 'sinon'

let authServiceStubs : sinon.SinonStub[]

export function setCurrentUser(staff: Staff) {
  authServiceStubs = [
    sinon.stub(authService, 'authenticate').returns(Promise.resolve(staff)),
    sinon.stub(authService, 'authenticateHeaders').returns(Promise.resolve(staff))
  ];
}

export function clearCurrentUser() {
  if (authServiceStubs) {
    authServiceStubs.forEach(s => s.restore());
    authServiceStubs = null;
  }
}
