import logger from 'loglevel';
import { Command } from 'commander';
import {
  loadConfig
} from '../config';

export function getConfig(options: any, command: Command): void {
  const config = loadConfig(command);
  logger.info(JSON.stringify(config, null, 2));
}

export const getConfigCommand = new Command()
  .name('get-config')
  .description('displays config with credentials')
  .action(getConfig);
