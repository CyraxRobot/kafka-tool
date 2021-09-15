import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getKafkaClient, isTopicExists
} from '../utils';

export async function resetOffset(options: { groupId: string, topic: string, earliest: boolean }, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  const { groupId, topic, earliest } = options;
  try {
    await kafkaAdminClient.connect();
    if (!await isTopicExists(kafkaAdminClient, topic)) {
      logger.warn(`topic ${topic} does not exist`);
      return;
    }
    const groups = await kafkaAdminClient.listGroups();
    const filteredGroups = groups.groups.filter((group) => group.groupId === groupId);
    if (!filteredGroups.length) {
      logger.warn(`groupId '${groupId} does not exists'`);
      return;
    }

    await kafkaAdminClient.resetOffsets({ groupId, topic, earliest });
    const fetchedOffsets = await kafkaAdminClient.fetchOffsets({ groupId, topics: [topic] });
    logger.info(JSON.stringify(fetchedOffsets, null, 2));
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const resetOffsetCommand = new Command()
  .name('reset-offset')
  .alias('ro')
  .description('resets offset of given groupId (earliest | latest(default: -1))')
  .requiredOption('--group-id <name>', 'group id')
  .requiredOption('--topic <name>', 'name of the topic')
  .option('--earliest', 'reset offset to the earliest or latest (by default)', false)
  .action(resetOffset);
