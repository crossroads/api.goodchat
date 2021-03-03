import { GoodChatConfig }   from 'lib/typings/goodchat';
import * as Sunshine        from 'sunshine-conversations-client'

export default (config: GoodChatConfig) => {
  let client = Sunshine.ApiClient.instance;

  let { basicAuth } = client.authentications;

  basicAuth.username = config.smoochApiKeyId;
  basicAuth.password = config.smoochApiKeySecret;
}
