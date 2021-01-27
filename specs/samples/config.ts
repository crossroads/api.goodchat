import { GoodChatAuthMode, GoodChatConfig } from "../../lib/types";

export const BLANK_CONFIG : GoodChatConfig = {
  smoochAppId:            'sample_app_id',
  smoochApiKeyId:         'sample_api_key_id',
  smoochApiKeySecret:     'sample_api_key_secret',
  goodchatHost:           'localhost:8000',
  authMode:               GoodChatAuthMode.NONE
}
