//
// Spec setup
//
//

import _                      from 'lodash'
import chai, { expect }       from 'chai'
import sinonChai              from 'sinon-chai'
import db                     from '../../lib/db'
import { each }               from '../../lib/utils/async';

chai.should();
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
