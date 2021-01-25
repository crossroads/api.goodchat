import { GoodChatConfig }                 from '../types'
// import jwt                                from 'jsonwebtoken'
import * as SunshineConversationsClient   from 'sunshine-conversations-client'

export default (config: GoodChatConfig) => {
  let client = SunshineConversationsClient.ApiClient.instance;

  let { basicAuth } = client.authentications;

  basicAuth.username = config.smoochApiKeyId;
  basicAuth.password = config.smoochApiKeySecret;

  // var bearerAuth = defaultClient.authentications['bearerAuth'];
  // jwt.sign({})
  // bearerAuth.accessToken = 'YOUR_ACCESS_TOKEN';
}
