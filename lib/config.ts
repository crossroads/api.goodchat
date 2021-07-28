import { GoodChatAuthConfig, GoodChatAuthMode, GoodChatConfig } from "./typings/goodchat";
import { read }                                                 from "./utils/env";

function authConfig() : GoodChatAuthConfig {
  if (read.bool('NO_AUTH')) { return { mode: GoodChatAuthMode.NONE } }

  return {
    mode: GoodChatAuthMode.WEBHOOK,
    url:  read.string.strict('GOODCHAT_AUTH_URL')
  }
}

const loadConfig = () : GoodChatConfig => {
  return {
    appName:                read('GOODCHAT_APP_NAME', 'GoodChat'),
    goodchatHost:           read.strict('GOODCHAT_HOST'),
    smoochAppId:            read.strict('SMOOCH_APP_ID'),
    smoochApiKeyId:         read.strict('SMOOCH_API_KEY_ID'),
    smoochApiKeySecret:     read.strict('SMOOCH_API_KEY_SECRET'),
    auth:                   authConfig(),
    jobs: {
      delay: read.number('JOB_DELAY', 0)
    },
    redis: {
      url: read.strict('REDIS_URL')
    },
  }
}

const config = loadConfig();

export const reloadConfig = () => {
  Object.assign(config, loadConfig())
}

export const useConfig = (cfg: Partial<GoodChatConfig>) => {
  Object.assign(config, cfg);
}

export default config;
