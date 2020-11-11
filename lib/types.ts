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