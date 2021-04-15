import logger    from './logger'
import _         from 'lodash'
import { Maybe } from '../typings/lang';

const { error } = logger('env');

interface ReadFunction<T> {
  (key : string, defaultVal? : T) : T,
  strict: (key : string) => T
}

type StringReader     = ReadFunction<string>;
type BoolReader       = ReadFunction<boolean>;
type NumberReader     = ReadFunction<number>;

type EnvReader = ReadFunction<string> & {
  bool:   BoolReader,
  string: StringReader,
  number: NumberReader
}

/**
 * Environment read method, supports:
 * - normal string reads with default values
 * - strict reads with process termination
 * - boolean reads
 * - number reads
 *
 * e.g
 *
 * ```typescript
 *  read('NODE_ENV', 'development')
 *  read.strict('GITHUB_TOKEN')
 *  read.number('PORT', 8000)
 *  read.bool('IS_TRUE')
 *  read.number.strict('NUM')
 * ```
 */
export const read : EnvReader = (() => {

  const anyReader = (key : string, defaultVal? : any) : any => {
    return process.env[key] || defaultVal || null;
  }

  const readers : any = {
    string: (key : string, defaultVal? : string) : Maybe<string> => {
      return anyReader(key, defaultVal);
    },
    bool: (key : string) : Maybe<boolean> => {
      const val = readers.string(key);
      return val === null ? null : /^true$/i.test(val) || /^yes$/i.test(val)
    },
    number: (key : string, defaultVal? : number) : Maybe<number> => {
      const val = anyReader(key, defaultVal);
      return val === null ? null : Number(val);
    }
  };

  _.each(readers, (fn : any) => {
    fn.strict = (key: string) => {
      const val = fn(key);

      if (val !== null) return val;

      error(`Missing environment variable '${key}'`);
      error(`Exiting`);
      process.exit(1);
    };
  });

  return _.reduce(readers, (obj, fn, key) => {
    obj[key] = fn;
    return obj;
  }, readers.string)
})();

