import figlet     from 'figlet'
import chalk      from 'chalk'
import _          from 'lodash'
import pkg        from '../package.json'
import { read }   from '../lib/utils/env'

export default function splash() {
  console.log(figlet.textSync('goodchat'));
  console.log('\n\n');

  const props = {
    "🔖 name": read('GOODCHAT_APP_NAME'),
    "🏷  version": pkg.version,
    "🖼️  environment": read.strict('NODE_ENV'),
    "💾 database": read('DB_NAME', 'n/a'),
    "🎅 author": pkg.author,
    "📝 license": pkg.license
  }

  _.each(props, (prop, key) => {
    console.log(`  ${chalk.cyan(key)}: ${prop}`);
  });

  console.log('\n');
}
