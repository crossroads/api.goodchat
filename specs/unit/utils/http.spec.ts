import { expect }                 from 'chai'
import _                          from 'lodash'
import { parseAcceptLanguage }    from 'lib/utils/http'   

describe('Utils/http', () => {
  const supportedLanguages = ['en', 'zh_tw'];

  context('Parse Accept-Language', () => {
    it('ignores unsupported languages', () => {
      expect(parseAcceptLanguage('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5', supportedLanguages)).to.equal('en');
      expect(parseAcceptLanguage('fr-CH, fr;q=0.9, de;q=0.7, *;q=0.5', supportedLanguages)).to.equal('en');
    })

    it('takes the supported language with the highest q level', () => {
      expect(parseAcceptLanguage('zh_tw;q=0.9, en;q=0.8', supportedLanguages)).to.equal('zh_tw');
      expect(parseAcceptLanguage('zh_tw;q=0.8, en;q=0.9', supportedLanguages)).to.equal('en');
    })

    it('takes the first supported language if levels are equal', () => {
      expect(parseAcceptLanguage('zh_tw;q=0.8, en;q=0.8', supportedLanguages)).to.equal('zh_tw');
      expect(parseAcceptLanguage('zh_tw, en', supportedLanguages)).to.equal('zh_tw');
      expect(parseAcceptLanguage('en;q=0.8, zh_tw;q=0.8', supportedLanguages)).to.equal('en');
      expect(parseAcceptLanguage('en, zh_tw', supportedLanguages)).to.equal('en');
    })

    it('uses the default language if header is empty, missing or invalid', () => {;
      expect(parseAcceptLanguage('', supportedLanguages)).to.equal('en');
      expect(parseAcceptLanguage(undefined, supportedLanguages)).to.equal('en');
      expect(parseAcceptLanguage('not a real;q=a header', supportedLanguages)).to.equal('en');
    })
  });
});
