import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getKafkaClient, isTopicExists
} from '../utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const isoDate = require('@segment/isodate');

function parseIsoDateIntoUnixMs(value: string): number | Error {
  try {
    const date = isoDate.parse(value);
    return date.getTime();
  } catch (err) {
    return err;
  }
}

function parseUnixTimestamp(value: string): number | Error {
  const asInt = parseInt(value, 10);
  if (Number.isNaN(asInt)) {
    return new Error('invalid timestamp');
  }
  return asInt;
}

type ModeTimestamp = { mode: 'timestamp', value: number };
type ModeOffset = { mode: 'offset', value: { offset: string, partition: number }[] };

export async function setOffset(options: {
  groupId: string,
  topic: string,
  timestampISO: string,
  timestampUnix: string,
  offsets: string,
  dry: boolean
}, command: Command): Promise<void> {
  const config = loadConfig(command);
  const kafkaClient = getKafkaClient(config);
  const kafkaAdminClient = kafkaClient.admin();
  const {
    groupId, topic, timestampISO, timestampUnix, offsets, dry
  } = options;
  try {
    let modeData: ModeTimestamp | ModeOffset;

    if ((timestampISO || timestampUnix) && offsets) {
      logger.error('do not use --timestamp### with --offsets at the same time');
      return;
    }
    if ((timestampISO && timestampUnix)) {
      logger.error('please chose --timestampISO or --timestampUnix, not both');
      return;
    }
    if (!timestampISO && !timestampUnix && !offsets) {
      logger.error('please chose approach how you want to set offsets: [--timestampISO, --timestampUnix, --offsets]');
      return;
    }

    if ((timestampISO || timestampUnix)) {
      let timestampMs: number | undefined;
      if (timestampISO) {
        const v = parseIsoDateIntoUnixMs(timestampISO);
        if (v instanceof Error) {
          logger.error(v);
          return;
        }
        timestampMs = v;
      } else {
        const v = parseUnixTimestamp(timestampUnix);
        if (v instanceof Error) {
          logger.error(v);
          return;
        }
        timestampMs = v;
      }
      modeData = { mode: 'timestamp', value: timestampMs };
    } else {
      const parsedOffsets = offsets
        .split(',')
        .map((pair) => {
          const [partition, offset] = pair.split('=').map((el) => el.trim());
          return { partition: +partition, offset };
        });
      modeData = { mode: 'offset', value: parsedOffsets };
    }

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

    if (modeData.mode === 'timestamp') {
      const partitions = await kafkaAdminClient.fetchTopicOffsetsByTimestamp(topic, modeData.value);
      const setOffsetsCommandOptions = {
        groupId,
        topic,
        partitions: partitions.sort((a, b) => a.partition - b.partition)
      };
      if (!dry) {
        await kafkaAdminClient.setOffsets(setOffsetsCommandOptions);
      } else {
        logger.info('setOffsets will be applied with:', JSON.stringify(setOffsetsCommandOptions, null, 2));
      }
    } else if (modeData.mode === 'offset') {
      const setOffsetsCommandOptions = {
        groupId,
        topic,
        partitions: modeData.value
      };
      if (!dry) {
        await kafkaAdminClient.setOffsets(setOffsetsCommandOptions);
      } else {
        logger.info('setOffsets will be applied with:', JSON.stringify(setOffsetsCommandOptions, null, 2));
      }
    }
  } finally {
    await kafkaAdminClient.disconnect();
  }
}

export const setGroupOffsetCommand = new Command()
  .name('set-group-offset')
  .alias('setgo')
  .description('sets new offsets for a consumer group')
  .requiredOption('--group-id <name>', 'group id')
  .requiredOption('--topic <name>', 'name of the topic')
  .option('--timestampISO <ISO8601>', 'sets new offsets for the group in ISO8601 format')
  .option('--timestampUnix <milliseconds>', 'sets new offsets for the group in Unix format(milliseconds)')
  .option('--offsets <list of pairs partition=offset>')
  .option('--dry', 'displays what operations will be applied but does not apply anything', false)
  .action(setOffset);
