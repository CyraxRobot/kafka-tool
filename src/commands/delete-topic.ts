import { Command } from 'commander';
import logger from 'loglevel';
import { getKafkaClient, isTopicExists, parseNumber } from '../utils';
import { loadConfig } from '../config';

export async function deleteTopic(topicName: string, options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    await kafkaAdminClient.connect();
    const {
      timeout
    } = options as {
      timeout: string,
    };
    if (!(await isTopicExists(kafkaAdminClient, topicName))) {
      logger.warn(`Topic '${topicName}' has already deleted`);
      return;
    }
    logger.info({ topicName, options });

    const topicOptions = {
      timeout: parseNumber(timeout),
      topics: [topicName]
    };

    await kafkaAdminClient.deleteTopics(topicOptions);
    logger.setDefaultLevel(1);

    if (!(await isTopicExists(kafkaAdminClient, topicName))) {
      logger.warn(`Topic '${topicName}' successfully deleted`);
      return;
    }
  } catch (err) {
    logger.error(err);
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const deleteTopicCommand = new Command()
  .name('delete-topic')
  .description('deletes topic by name')
  .alias('dt')
  .option('--timeout <numberMs>', 'Timeout for delete command', '5000')
  .argument('<topicName>', 'topic name to delete')
  .action(deleteTopic);
