import ngrok                from 'ngrok'
import goodchat             from '..'
import logger               from '../lib/utils/logger'
import { read }             from '../lib/utils/env'
import { GoodChatAuthMode } from '../lib/types';

const port  = read.number('PORT', 8000);
const env   = read('NODE_ENV', 'development')
const dev   = /dev/.test(env);

const { info } = logger('startup');

// -------------------------
// Helpers
// -------------------------

async function resolveHost() : Promise<string> {
  const host = !dev ? read.strict('GOODCHAT_HOST') : await (() => {
    info('firing up ngrok'); 
    return ngrok.connect({
      proto: 'http',
      addr:   port
    });
  })()

  info(`goodchat app hosted on ${host}`)

  return host;
}

function authMode() : GoodChatAuthMode {
  return read.bool('NO_AUTH') ? GoodChatAuthMode.NONE : GoodChatAuthMode.JWT;
}

// -------------------------
// Startup
// -------------------------

(async function() {
  const { info } = logger('startup');

  info(`${env} environment detected`);

  const app = goodchat({
    goodchatHost:           await resolveHost(),
    smoochAppId:            read.strict('SMOOCH_APP_ID'),
    smoochApiKeyId:         read.strict('SMOOCH_API_KEY_ID'),
    smoochApiKeySecret:     read.strict('SMOOCH_API_KEY_SECRET'),
    authMode:               authMode()
  })

  app.listen(port, () => {
    info(`goodchat server running on port ${port}`);
  });

})();
