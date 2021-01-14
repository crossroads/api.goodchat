import { expect }                 from 'chai'
import Koa                        from 'koa'
import i18n                       from '../../../lib/middlewares/i18n'
import _                          from 'lodash'
import { createBlankServer }      from '../../spec_helpers/agent'
import { KoaChatContext } from '../../../lib/types'

const MOCK_LOCALES = {
  en: { title: "GoodChat En" },
  zh_tw: { title: "GoodChat ZhTw"}
}

describe('Middlewares/i18n', () => {
  const server = async (mw : Function) => {
    return createBlankServer([ await i18n({ staticCatalog: MOCK_LOCALES }), mw ])
  };

  it('adds an i18n instance to the context', async () => {
    const [app, agent] = await server((ctx: KoaChatContext, next: Koa.Next) => {
      expect(ctx.i18n).to.exist
      expect(ctx.i18n.__).to.exist
      ctx.status = 200;
      next();
    });

    await agent.get('/').expect(200)
  })

  it('translates a string using ctx.i18n.__', async () => {
    const [app, agent] = await server((ctx: KoaChatContext, next: Koa.Next) => {
      ctx.status = 200;
      ctx.body = { text: ctx.i18n.__("title") };
      next();
    });

    await agent.get('/')
      .expect({ text: "GoodChat En" })
      .expect(200)
  })

  describe("Request defined language", () => {
    it('extracts the language from the accept-language header', async () => {
      const [app, agent] = await server((ctx: KoaChatContext, next: Koa.Next) => {
        ctx.status = 200;
        ctx.body = { text: ctx.i18n.__("title") };
        next();
      });

      await agent.get('/')
        .set('accept-language', 'zh_tw')
        .expect({ text: "GoodChat ZhTw" })
        .expect(200)
    });

    it('takes language with the strongest quality value', async () => {
      const [app, agent] = await server((ctx: KoaChatContext, next: Koa.Next) => {
        ctx.status = 200;
        ctx.body = { text: ctx.i18n.__("title") };
        next();
      });

      await agent.get('/')
        .set('accept-language', 'en;q=0.3, zh_tw;q=0.7')
        .expect({ text: "GoodChat ZhTw" })
        .expect(200)
    });

    it('ignores unsupported languages', async () => {
      const [app, agent] = await server((ctx: KoaChatContext, next: Koa.Next) => {
        ctx.status = 200;
        ctx.body = { text: ctx.i18n.__("title") };
        next();
      });

      await agent.get('/')
        .set('accept-language', 'fr;q=0.9, en;q=0.3, zh_tw;q=0.7')
        .expect({ text: "GoodChat ZhTw" })
        .expect(200)
    });
  })
});
