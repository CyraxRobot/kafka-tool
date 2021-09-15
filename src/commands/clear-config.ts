import logger from 'loglevel';
import { Command } from 'commander';
import {
  getConf
} from '../config';

export function clearConfig(options: any, command: Command): void {
  const { env } = command.parent?.opts() || {};
  const conf = getConf(env);
  conf.clear();
  const config = conf.store;
  logger.info(JSON.stringify(config, null, 2));
}

export const clearConfigCommand = new Command()
  .name('clear-config')
  .description('delete all items in config by env')
  .action(clearConfig);
