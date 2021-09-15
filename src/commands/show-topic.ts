import { Command } from 'commander';
import logger from 'loglevel';
import clc from 'cli-color';
import { ConfigResourceTypes } from 'kafkajs';
import Table from 'cli-table3';
import { loadConfig } from '../config';
import {
  getKafkaClient,
  isTopicExists
} from '../utils';

let tableStyleOptions = {
  chars: {
    top: '',
    'top-mid': '',
    'top-left': '',
    'top-right': '',
    bottom: '',
    'bottom-mid': '',
    'bottom-left': '',
    'bottom-right': '',
    left: '',
    'left-mid': '',
    mid: '',
    'mid-mid': '',
    right: '',
    'right-mid': '',
    middle: ' '
  },
  style: { 'padding-left': 0, 'padding-right': 0 }
};

const keyBy = (array: any[], key: string) => (array || []).reduce((r, x) => ({ ...r, [key ? x[key] : x]: x }), {});

export async function showTopic(topicName: string, options: { verbose: boolean, noBorders: boolean }, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  const { verbose, noBorders } = options;
  if (!noBorders) {
    tableStyleOptions = Object.create(null);
  }
  try {
    await kafkaAdminClient.connect();
    if (!await isTopicExists(kafkaAdminClient, topicName)) {
      logger.info(`Topic '${topicName}' does not exist`);
      return;
    }

    const topicInfo = await kafkaAdminClient.fetchTopicMetadata({
      topics: [topicName]
    });

    const [topic] = topicInfo.topics;
    if (!topic) {
      logger.info('There is no info for topic');
      return;
    }

    logger.info(`${clc.bold('topic:')} ${topicName}`);
    logger.info(`${clc.bold('number of partitions:')} ${topic.partitions.length}`);

    const topicOffsets = await kafkaAdminClient.fetchTopicOffsets(topicName);
    const patitionWithOffsetsHead = ['partition', 'offset', 'high', 'low', 'leader', 'replicas', 'isr', 'offlineReplicas'];
    const offsetsTable = new Table({
      head: patitionWithOffsetsHead,
      ...tableStyleOptions
    });
    const offsetsRows = topicOffsets.sort((a, b) => a.partition - b.partition);
    const fullPartitionInfo = Object.values(Object.assign(keyBy(topicInfo.topics[0].partitions, 'partitionId'), keyBy(offsetsRows, 'partition')));
    const partitionRows = fullPartitionInfo.map((partition) => patitionWithOffsetsHead.map((colName) => `${(partition as any)[colName]}`));
    offsetsTable.push(...partitionRows);
    logger.info(offsetsTable.toString());

    if (verbose) {
      const describeTopicInfo = await kafkaAdminClient.describeConfigs({
        includeSynonyms: false,
        resources: [
          {
            type: ConfigResourceTypes.TOPIC,
            name: topicName
          }
        ]
      });

      logger.info(clc.bold('Topic config entries:'));
      const { configEntries } = describeTopicInfo.resources[0];
      const topicInfoHead = Object.keys(configEntries[0]);
      const topicInfoTable = new Table({
        head: topicInfoHead,
        ...tableStyleOptions
      });
      const topicInfoRows = configEntries.map((entry) => topicInfoHead.map((colName) => `${(<any>entry)[colName]}`));
      topicInfoTable.push(...topicInfoRows);
      logger.info(topicInfoTable.toString());
    }
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const showTopicCommand = new Command()
  .name('show-topic')
  .alias('st')
  .description('show all options about given topic')
  .argument('<topicName>', 'name of topic')
  .option('--verbose', 'increase verbocity level', false)
  .option('--noBorders', 'remove table borders', false)
  .action(showTopic);
