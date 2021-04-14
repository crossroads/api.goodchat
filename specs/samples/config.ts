import { GoodChatAuthMode, GoodChatConfig } from "../../lib/typings/goodchat";

export const FAKE_AUTH_HOST     = 'https://fake.biz'
export const FAKE_AUTH_ENDPOINT = '/endpoint'
export const FAKE_AUTH_URL      = `${FAKE_AUTH_HOST}${FAKE_AUTH_ENDPOINT}`

export const BLANK_CONFIG : GoodChatConfig = {
  smoochAppId:            'sample_app_id',
  smoochApiKeyId:         'sample_api_key_id',
  smoochApiKeySecret:     'sample_api_key_secret',
  goodchatHost:           'localhost:8000',
  auth: {
    mode: GoodChatAuthMode.NONE
  }
}

export const WEBHOOK_AUTH_CONFIG = {
  ...BLANK_CONFIG,
  auth: {
    mode: GoodChatAuthMode.WEBHOOK,
    url: FAKE_AUTH_URL
  }
}
