import { pubsub }   from "../../lib/services/events"

export function waitForPubSub(ev: string, count: number = 1) : Promise<any[]> {
  const events : any[] = [];
  let finished = false;
  return new Promise(async (done, reject) => {
    const id = await pubsub.subscribe(ev, (payload) => {
      events.push(payload);
      if (!finished && events.length === count) {
        finished = true;
        done(events);
        pubsub.unsubscribe(id)
      }
    })

    setTimeout(() => {
      if (!finished) {
        finished = true;
        pubsub.unsubscribe(id)
        reject(new Error('waitForPubSub timeout'))
      }
    }, 1000)
  })
}
