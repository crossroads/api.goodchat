import debug  from 'debug'
import _      from 'lodash'

function fill(count: number, char: string = ' ') : string {
  return _.range(count).map(() => char).join('');
}

export default function (name = 'goodchat') {
  const panic = debug(`${name}:panic`);
  const shout = debug(`${name}:shout`);

  return {
    info: debug(`${name}:info`),
    error:  debug(`${name}:error`),
    verbose: debug(`${name}:verbose`),

    panic: ((arg : any) : never => {
      panic(arg);
      return process.exit(1);
    }),

    shout: (arg : string) => {
      const lines = arg.split('\n');
      const len   = Math.max(..._.map(lines, 'length')) + 6;

      let out = lines.map(l => `  ${l} ${fill(len - l.length)}`);

      shout([
        fill(len, '*'),
        ...out,
        fill(len, '*')
      ].join('\n'))
    }
  };
};
