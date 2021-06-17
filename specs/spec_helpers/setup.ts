//
// Spec setup
//
//

import _                      from 'lodash'
import chai, { expect }       from 'chai'
import sinonChai              from 'sinon-chai'
import timekeeper             from 'timekeeper'
import chaiPromises           from 'chai-as-promised'
import db                     from '../../lib/db'
import axios                  from 'axios'
import { each }               from '../../lib/utils/async'
import * as pubsub            from '../../lib/services/events'
import * as redisConnections  from '../../lib/redis'
import * as jobs              from '../../lib/jobs/job'

axios.defaults.adapter = require('axios/lib/adapters/http')

chai.should();
chai.use(chaiPromises)
chai.use(sinonChai);

const capitalize = (s : string) => s.charAt(0).toUpperCase() + s.slice(1);

const TABLES_NAMES  = _.reject(_.keys(db), (k) => /^_/.test(k)) as string[]

// ----------------------------
// Database cleanup
// ----------------------------

async function resetDatabase() {
  await each(TABLES_NAMES, (name : string) => db.$executeRaw(`TRUNCATE "${capitalize(name)}" CASCADE`))
}

async function cleanJob(job: jobs.AnyGoodChatJob) {
  await job.queue.clean(0, Infinity, "completed")
  await job.queue.clean(0, Infinity, "wait")
  await job.queue.clean(0, Infinity, "active")
  await job.queue.clean(0, Infinity, "paused")
  await job.queue.clean(0, Infinity, "delayed")
  await job.queue.clean(0, Infinity, "failed")
}

before(async () => {
  console.info('Connecting to the database')

  await db.$connect();

  console.info('Clearing to the database')

  await resetDatabase();

  for (const table of TABLES_NAMES) {
    expect(await (<any>db)[table].count({})).to.eq(0, 'Test database should be empty')
  }
})

beforeEach(async () => {
  await resetDatabase();
  await Promise.all(
    jobs.getAllJobs().map(cleanJob)
  )
})

afterEach(() => {
  timekeeper.reset();
})

after(async () => {
  await db.$disconnect();
  await pubsub.disconnect();
  await jobs.shutdown(cleanJob);
  await redisConnections.closeAllConnections();
})
