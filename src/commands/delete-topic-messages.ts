import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import { isTopicExists, getKafkaClient } from '../utils';

export async function deleteTopicMessages(topicName: string, options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    await kafkaAdminClient.connect();
    if (!await isTopicExists(kafkaAdminClient, topicName)) {
      logger.warn(`topic ${topicName} does not exist`);
      return;
    }

    const topicInfo = await kafkaAdminClient.fetchTopicMetadata({
      topics: [topicName]
    });
    const [topicPartitiions] = topicInfo.topics;
    if (!topicPartitiions) {
      logger.error('topic metadata does not exist');
      return;
    }
    const DELETE_ALL_AVAILABLE_RECORDS_OFFSET = '-1';
    const partitions = topicPartitiions.partitions.map((partition) => ({
      offset: DELETE_ALL_AVAILABLE_RECORDS_OFFSET,
      partition: partition.partitionId
    }));
    await kafkaAdminClient.deleteTopicRecords({
      topic: topicName,
      partitions
    });
    logger.info(`all messages in topic ${topicName} were deleted`);
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const deleteTopicMessagesCommand = new Command()
  .name('delete-topic-messages')
  .alias('dtm')
  .description('deletes all messages in the given topic')
  .argument('<topicName>', 'name of the topic')
  .action(deleteTopicMessages);
