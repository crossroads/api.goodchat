import { expect }                 from 'chai'
import Sinon                      from 'sinon'
import _                          from 'lodash'
import { read }                   from 'lib/utils/env'

describe('Utils/env', () => {

  before(() => {
    process.env['A_NUMBER']         = '123';
    process.env['A_STRING']         = 'lorem ipsum';
    process.env['A_BOOLEAN']        = 'true';
    process.env['AN_EVIL_BOOL']     = 'false';
  });

  context('reading types', () => {
    it('reads a string using the default reader', () => {
      expect(read('A_STRING')).to.equal('lorem ipsum');
    })

    it('reads a string', () => {
      expect(read.string('A_STRING')).to.equal('lorem ipsum');
    })
    it('reads a number', () => {
      expect(read.number('A_NUMBER')).to.equal(123);
    })
    it('reads a bool', () => {
      expect(read.bool('A_BOOLEAN')).to.equal(true);
      expect(read.bool('AN_EVIL_BOOL')).to.equal(false);
    })
  });

  context('strict', () => {
    let exitStub : Sinon.SinonStub;

    beforeEach(() => exitStub = Sinon.stub(process, 'exit'))
    afterEach(()  => exitStub.restore())

    _.each([
      'strict',
      'string.strict',
      'bool.strict',
      'number.strict'
    ], (fnProp) => {
      it(`exits if #read.${fnProp} fails to read a variable`, () => {
        _.get(read, fnProp)('A_MISSIN_VAR')
        exitStub.should.have.been.calledOnceWith(1);
      });
    });
  });
});
