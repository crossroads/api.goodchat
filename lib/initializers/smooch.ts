import { GoodChatConfig }   from '../../lib/typings/goodchat';
import * as Sunshine        from 'sunshine-conversations-client'

export default (config: GoodChatConfig) : void => {
  const client = Sunshine.ApiClient.instance;

  const { basicAuth } = client.authentications;

  basicAuth.username = config.smoochApiKeyId;
  basicAuth.password = config.smoochApiKeySecret;
}
