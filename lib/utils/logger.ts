import debug from 'debug'

export default function (name = 'goodchat') {
  return {
    info: debug(`${name}:info`),
    error: debug(`${name}:error`),
    verbose: debug(`${name}:verbose`)
  };
};