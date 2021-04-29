import { Worker, Queue, QueueScheduler, Processor }        from "bullmq"
import _                                                   from "lodash";
import { createConnection }                                from "../redis"
import { each }                                            from "../utils/async";

const CONCURRENCY = 30;

type GoodChatJob = {
  name: string,
  scheduler: QueueScheduler,
  queue: Queue,
  worker: Worker
}

const allJobs : Record<string, GoodChatJob> = {};

/**
 * Creates a Queue alongisde its worker and scheduler
 *
 * @export
 * @template In the type of argument the worker receives
 * @template Out the output type of the worker
 * @template Types the job types a worker can receive
 * @param {string} name
 * @param {Processor<In, Out, Types>} processor
 * @returns
 */
export function createJob<In, Out, Types extends string>(name: string, processor: Processor<In, Out, Types>) {

  const scheduler = new QueueScheduler(name, { connection: createConnection() });

  const queue = new Queue<In, Out, Types>(name, {
    connection: createConnection()
  });

  const worker = new Worker<In, Out, Types>(name, processor, {
    connection: createConnection(),
    concurrency: CONCURRENCY
  })

  const res : GoodChatJob = { name, scheduler, queue, worker };

  allJobs[name] = res;

  return res;
}

/**
 * Return all goodchat jobs
 *
 * @export
 * @returns
 */
export function getAllJobs() {
  return _.values(allJobs);
}

/**
 * Terminates all queues and connections
 *
 * @export
 * @param {AnyFunc} [customeRoutine=_.noop]
 */
export async function shutdown(customeRoutine : (job: GoodChatJob) => any = _.noop) {
  const jobs = _.values(allJobs);

  await each(jobs, async job => {
    await customeRoutine(job)
    await job.scheduler.close()
    await job.queue.close()
    await job.worker.close()
  })
}
