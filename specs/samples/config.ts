import { GoodChatAuthMode, GoodChatConfig } from "../../lib/typings/goodchat";

export const BLANK_CONFIG : GoodChatConfig = {
  smoochAppId:            'sample_app_id',
  smoochApiKeyId:         'sample_api_key_id',
  smoochApiKeySecret:     'sample_api_key_secret',
  goodchatHost:           'localhost:8000',
  auth: {
    mode: GoodChatAuthMode.NONE
  }
}

