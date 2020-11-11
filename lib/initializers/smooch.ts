import { GoodChatConfig }                 from '../types'
import * as SunshineConversationsClient   from 'sunshine-conversations-client'

export default (config: GoodChatConfig) => {
  let client = SunshineConversationsClient.ApiClient.instance;

  let { basicAuth } = client.authentications;

  basicAuth.username = config.smoochApiKeyId;
  basicAuth.password = config.smoochApiKeySecret;
}