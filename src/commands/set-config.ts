import logger from 'loglevel';
import { Command } from 'commander';
import {
  getConf, loadConfig, parseConfig
} from '../config';
import clc from 'cli-color';

function renderError(error: Error | AggregateError): string {
  if (error instanceof AggregateError) {
    let msg = clc.red(error.message) + '\n';
    for (const err of error.errors) {
      msg += err.message + '\n';
    }
    return msg;
  }

  return error.message;
}

export function setConfig(jsonToLoad: string, options: any, command: Command): void {
  const { env } = command.parent?.opts() || {};
  const conf = getConf(env);

  const loadedConfig = JSON.parse(jsonToLoad);
  const parseResult = parseConfig(loadedConfig);
  if (!parseResult.error) {
    Object.entries(loadedConfig).forEach(([name, value]) => {
      conf.set(name, value);
    });
    logger.info('config successfully loaded');
    logger.info(JSON.stringify(loadConfig(command), null, 2));
  } else {
    logger.error(renderError(parseResult.error));
  }
}

export const setConfigCommand = new Command()
  .name('set-config')
  .description('sets config with creadentials for kafka and schema registry')
  .argument('<json>', 'json config with credentials')
  .action(setConfig);
