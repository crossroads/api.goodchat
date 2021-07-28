import db from '../db'
import _  from 'lodash'

async function touchConversation(id: number) {
  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() }
  })
}

export default () => {
  //
  // Set-up lifecycle behavious of the GoodChat service
  //
  db.$use(async (params, next) => {
    const result = await next(params);

    //
    // When a message gets created, we "touch" the conversation to update its timestamp
    // That the update on the conversation record will allow to listen to changes on the conversation itself
    //
    if (params.model === 'Message' && params.action == 'create') {
      const conversationId = _.get(params, 'args.data.conversationId');
      if (_.isNumber(conversationId)) {
        await touchConversation(conversationId);
      }
    }

    return result;
  })
}

