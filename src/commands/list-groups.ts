import { Command } from 'commander';
import logger from 'loglevel';
import clc from 'cli-color';
import { EOL } from 'os';
import { loadConfig } from '../config';
import {
  getKafkaClient
} from '../utils';

export async function listGroups(options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    await kafkaAdminClient.connect();
    const groups = await kafkaAdminClient.listGroups();
    logger.setDefaultLevel(1);
    groups.groups.forEach((group) => {
      logger.info(`${clc.bold('groupId:')} ${group.groupId}`);
      logger.info(`${clc.bold('protocolType:')} ${group.protocolType}${EOL}`);
    });
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const listGroupsCommand = new Command()
  .name('list-groups')
  .alias('lg')
  .description('list all groups in kafka')
  .action(listGroups);
