import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getKafkaClient
} from '../utils';

export async function listTopics(options: unknown, command: any): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    await kafkaAdminClient.connect();
    const topics = await kafkaAdminClient.listTopics();
    const filtered = topics.filter((topic) => topic.charAt(0) !== '_');
    logger.setDefaultLevel(1);
    filtered.forEach((t) => logger.log(t));
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const listTopicsCommand = new Command()
  .name('list-topics')
  .alias('lt')
  .description('list all topics in kafka')
  .action(listTopics);
