import logger from './logger';

export type CleanupTask = () => any
export type FinalTask = (e: any) => never

const run = (fn: CleanupTask) => fn();

const { info, panic } = logger('process')

const tasks : Set<CleanupTask> = new Set();

/**
 * Allows us to create cleanup tasks before the process exits
 *
 * @export
 * @returns
 */
export function gracefulExit(task: CleanupTask) {
  tasks.add(task);

  if (tasks.size === 1) {

    let triggered = false;

    [
      'beforeExit',
      'uncaughtException',
      'unhandledRejection',
      'SIGHUP',
      'SIGINT',
      'SIGQUIT',
      'SIGILL',
      'SIGTRAP',
      'SIGABRT',
      'SIGBUS',
      'SIGFPE',
      'SIGUSR1',
      'SIGSEGV',
      'SIGUSR2',
      'SIGTERM'
    ].forEach(ev => {
      process.on(ev, async (e) => {
        info(`${ev} signal received`);
        if (!triggered) {
          triggered = true;
          await Promise.all(Array.from(tasks).map(run));
          panic(e);
        }
      });
    });
  }
}
