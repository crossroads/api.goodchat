import { I18n } from "i18n";
import Koa      from "koa"

export enum GoodChatAuthMode {
  JWT =   "jwt",
  NONE =  "none"
}

export interface GoodChatConfig {
  smoochAppId:            string
  smoochApiKeyId:         string
  smoochApiKeySecret:     string
  goodchatHost:           string
  authMode:               GoodChatAuthMode
}

export interface KoaChatContext extends Koa.Context {
  config: GoodChatConfig,
  i18n:   I18n
}

export interface KoaChatState extends Koa.DefaultState {
  // add custom state props here
}

export type GoodchatApp = Koa<KoaChatContext, KoaChatState>;
