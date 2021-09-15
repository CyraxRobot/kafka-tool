import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getKafkaClient
} from '../utils';

export async function describeCluster(options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    await kafkaAdminClient.connect();
    const clusterInfo = await kafkaAdminClient.describeCluster();
    logger.setDefaultLevel(1);
    logger.info(JSON.stringify(clusterInfo, null, 2));
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const describeClusterCommand = new Command()
  .name('describe-cluster')
  .alias('dc')
  .description('get info about cluster')
  .action(describeCluster);
