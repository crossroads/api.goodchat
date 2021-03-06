import { Staff }             from "@prisma/client";
import { I18n }              from "i18n"
import Koa                   from "koa"
import { SunshineContent }   from "./sunshine";

// --- Authentication config

export enum GoodChatAuthMode {
  WEBHOOK =  "webhook",
  NONE    =  "none"
}

export enum GoodChatPermissions {
  CHAT_CUSTOMER   = "chat:customer",
  ADMIN           = "admin"
}

interface NoProps {}

type _AuthSwitch<T extends GoodChatAuthMode, Props = NoProps> = Props & { mode: T }

export type GoodChatAuthConfig = (
  _AuthSwitch<GoodChatAuthMode.NONE> |
  _AuthSwitch<GoodChatAuthMode.WEBHOOK, { url: string }>
)

/**
 * Data expected from the auth server in order to authenticate a staff member
 *
 * @export
 * @interface AuthPayload
 */
export interface AuthPayload {
  displayName: string,
  userId: string|number
  permissions: GoodChatPermissions[]
}

// --- App Config

export interface GoodChatConfig {
  appName:            string
  smoochAppId:        string
  smoochApiKeyId:     string
  smoochApiKeySecret: string
  goodchatHost:       string
  auth:               GoodChatAuthConfig
  jobs: {
    delay: number
  },
  redis: {
    url: string
  }
}

// --- Koa Types


export interface KoaChatState extends Koa.DefaultState {
  staff: Staff
}
export interface KoaChatContext extends Koa.ParameterizedContext<KoaChatState> {
  config: GoodChatConfig,
  i18n:   I18n
}

export type KoaChatMiddleware = Koa.Middleware<KoaChatState, KoaChatContext>

export type GoodchatApp = Koa<KoaChatContext>

export type MessageContent = SunshineContent // We maintain the same data structure as sunshine for messages
