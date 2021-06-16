#!/usr/bin/env node

// --> dotenv preload <--
require('kankyo').inject({ verbose: true }); // eslint-disable-line

import goodchat                               from '..'
import http                                   from 'http'
import logger                                 from '../lib/utils/logger'
import config                                 from '../lib/config'
import { promisify }                          from 'util'
import { read }                               from '../lib/utils/env'
import { clearIntegration, setupWebhooks }    from '../lib/routes/webhooks/setup'
import { gracefulExit }                       from '../lib/utils/process'
import splash                                 from './splash'

const port  = read.number('PORT', 8000);
const env   = read('NODE_ENV', 'development')
const dev   = /development/.test(env);

const { info, panic } = logger('server');

// -------------------------
// Helpers
// -------------------------

async function resolveDevHost() : Promise<string> {
  const ngrok = await import('ngrok');

  info('firing up ngrok');

  return ngrok.connect({
    proto: 'http',
    addr:   port
  });
}

// -------------------------
// Startup
// -------------------------

(async function() {
  splash();

  try {
    info(`${env} environment detected`);

    if (dev) {
     config.goodchatHost = await resolveDevHost();
    }

    const [app, apollo] = await goodchat()

    const server = http.createServer(app.callback());

    apollo.installSubscriptionHandlers(server)

    const boot = promisify(server.listen.bind(server)) as (port: string|number) => Promise<void>

    await boot(port)

    info(`goodchat host: ${config.goodchatHost}`);
    info(`goodchat port: ${port}`);

    if (dev) {
      await setupWebhooks(config)
      gracefulExit(() => clearIntegration(config))
    }

  } catch (e) {
    panic(e)
  }
})();

