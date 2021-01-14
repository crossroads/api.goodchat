import debug from 'debug'

export default function (name = 'goodchat') {
  const panic = debug(`${name}:panic`);

  return {
    info: debug(`${name}:info`),
    error: debug(`${name}:error`),
    verbose: debug(`${name}:verbose`),
    panic: ((arg : any) : never => {
      panic(arg);
      return process.exit(1);
    })
  };
};
