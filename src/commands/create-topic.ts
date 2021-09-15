import { Command } from 'commander';
import logger from 'loglevel';
import { getKafkaClient, isTopicExists, parseNumber } from '../utils';
import { loadConfig } from '../config';

type ReplicaAssignmentSchema = Array<{
  partition: number;
  replicas: [number, ...number[]];
}>;

type ParseResult<T> = { value: T, error: null } | { value: null, error: AggregateError };

const parseReplicaAssignment = (replicaAssignment: Record<string, unknown>[]): ParseResult<ReplicaAssignmentSchema> => {
  const errors: Error[] = [];
  if (!Array.isArray(replicaAssignment)) {
    errors.push(new Error('return type is not an array'));
  }

  replicaAssignment.forEach((ra, i) => {
    if (!('partition' in ra)) {
      errors.push(new Error(`'partition' is required in replicaAssignment[${i}]`));
    }
    if (!('replicas' in ra)) {
      errors.push(new Error(`'replicas' is required in replicaAssignment[${i}]`));
    }

    if (typeof ra.partition !== 'number') {
      errors.push(new Error(`'partition' is not a number in replicaAssignment[${i}]`));
    }

    if (!Array.isArray(ra.replicas)) {
      errors.push(new Error(`'replicas' is not array in replicaAssignment[${i}]`));
    }

    (ra.replicas as number[]).forEach((item, idx) => {
      if (typeof item !== 'number') {
        errors.push(new Error(`replicaAssignment[${i}].replicas[${idx}] is not a number`));
      }
    });
  });

  if (errors.length) {
    return {
      error: new AggregateError(errors),
      value: null
    };
  }
  return {
    value: replicaAssignment as ReplicaAssignmentSchema,
    error: null
  };
};

export async function createTopic(topicName: string, options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  try {
    const {
      partitionsNum, replicationFactor, replicaAssignment, configEntries
    } = options as {
      partitionsNum: string,
      replicationFactor: string,
      replicaAssignment: string,
      configEntries: string
    };

    await kafkaAdminClient.connect();

    if (await isTopicExists(kafkaAdminClient, topicName)) {
      logger.warn(`Topic '${topicName}' has already exists`);
      return;
    }

    const parsedReplicaAssignment = (() => {
      const parsedJson = JSON.parse(replicaAssignment);
      if (Array.isArray(parsedJson) && parsedJson.length > 0) {
        const { error } = parseReplicaAssignment(parsedJson);
        if (error) {
          throw error;
        }
      }
      return parsedJson;
    })();

    const parsedConfigEntries: { name: string, value: any }[] = (() => {
      const parsedJson = JSON.parse(configEntries);
      return Object.entries(parsedJson).map(([name, value]) => ({ name, value }));
    })();

    const topicOptions = {
      replicationFactor: parseNumber(replicationFactor),
      numPartitions: parseNumber(partitionsNum),
      replicaAssignment: parsedReplicaAssignment,
      configEntries: parsedConfigEntries
    };
    const isTopicCreated = await kafkaAdminClient.createTopics({
      topics: [{
        topic: topicName,
        ...topicOptions
      }]
    });
    logger.setDefaultLevel(1);
    if (isTopicCreated) {
      logger.info(`Topic: "${topicName} is successfully created with options"`);
    }
    logger.info(JSON.stringify(topicOptions, null, 2));
  } catch (err) {
    logger.error(err);
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const createTopicCommand = new Command()
  .name('create-topic')
  .description('create new topic')
  .alias('ct')
  .requiredOption('-n, --partitions-num <number>', 'Number of partitions', '1')
  .requiredOption('--replication-factor <number>', 'replication factor see: https://kafka.js.org/docs/admin#a-name-create-topics-a-create-topics')
  .option('--replica-assignment <json>', 'Assigns partition by num to replicas. Example of json [{"partition": 0, "replicas": [0,1,2]},...]', '[]')
  .option('--config-entries <json>', '--extra {"cleanup.policy": "compact"}', '{}')
  .argument('<topicName>', 'get schema that matches to given name')
  .action(createTopic);
