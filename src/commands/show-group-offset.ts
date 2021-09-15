import { Command } from 'commander';
import { Admin } from 'kafkajs';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getKafkaClient
} from '../utils';

type UnPromisify<T> = T extends Promise<infer U> ? U : T;

function formatOutput(input: UnPromisify<ReturnType<Admin['fetchOffsets']>>): UnPromisify<ReturnType<Admin['fetchOffsets']>> {
  return input.map((entry) => ({
    topic: entry.topic,
    partitions: entry.partitions.sort((a, b) => a.partition - b.partition)
  }));
}

export async function showGroupOffset(groupId: string, options: { topics: string }, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  const { topics } = options;

  let topicsList: string[] = [];
  if (topics) {
    topicsList = topics.split(',');
  }
  try {
    await kafkaAdminClient.connect();
    const offsets = await kafkaAdminClient.fetchOffsets({ groupId });
    if (topicsList.length) {
      const filteledOffsets = offsets.filter((offset) => topicsList.includes(offset.topic));
      logger.info(JSON.stringify(formatOutput(filteledOffsets)));
      return;
    }
    logger.info(JSON.stringify(formatOutput(offsets), null, 2));
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const showGroupOffsetCommand = new Command()
  .name('show-group-offset')
  .alias('sgo')
  .description('display group offsets per partition')
  .argument('<groupId>', 'group id')
  .option('-t, --topics <list>', 'filter by topics', '')
  .action(showGroupOffset);
