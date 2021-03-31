//
// Spec setup
//
//

import _                      from 'lodash'
import chai, { expect }       from 'chai'
import sinonChai              from 'sinon-chai'
import chaiPromises           from 'chai-as-promised'
import db                     from '../../lib/db'
import axios                  from 'axios'
import { each }               from '../../lib/utils/async'

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
})

after(async () => {
  await db.$disconnect();
})
