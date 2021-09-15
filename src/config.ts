import { Command } from 'commander';
import Conf from 'conf';
import logger from 'loglevel';
import clc from 'cli-color';
import { GetOptionalKeys, GetRequiredKeys, Config } from './utils';

type UnknownConfig = Required<{ [t in keyof Config]: unknown }>;

const isString = (v: unknown): v is string => typeof v === 'string';
const requiredFields: (keyof GetRequiredKeys<Config>)[] = ['kafkaAccessKey', 'kafkaSecretKey', 'kafkaBootstrapServers'];
const optionalFields: (keyof GetOptionalKeys<Config>)[] = ['schemaRegistryAccessKey', 'schemaRegistrySecretKey', 'schemaRegistryUrl'];

type ParsedConfig = { value: Config; error: null };
type ParsedFailed = { value: null; error: AggregateError };
type ParseResult = ParsedConfig | ParsedFailed;

export const parseConfig = (confOptions: UnknownConfig): ParseResult => {
  const errors: Error[] = [];
  const configOnlyFields: Partial<Config> = {};
  requiredFields.forEach(reqField => {
    if (!(reqField in confOptions)) {
      errors.push(new Error(`field '${reqField}' is required`));
    }
    if (!isString(confOptions[reqField])) {
      errors.push(new Error(`field '${reqField}' is not string`));
    }
    configOnlyFields[reqField] = confOptions[reqField] as any;
  });
  optionalFields.forEach(optField => {
    if ((confOptions[optField]) && !isString(confOptions[optField])) {
      errors.push(new Error(`field '${optField}' is not string`));
    }
    configOnlyFields[optField] = confOptions[optField] as string;
  });

  if (errors.length) {
    return { value: null, error: new AggregateError(errors) };
  }

  return { value: configOnlyFields, error: null } as ParsedConfig;
};

export function getConf(env: string): Conf<UnknownConfig> {
  return new Conf({
    schema: {
      schemaRegistryUrl: { type: ['string', 'null'], default: null },
      schemaRegistrySecretKey: { type: ['string', 'null'], default: null },
      schemaRegistryAccessKey: { type: ['string', 'null'], default: null },
      kafkaSecretKey: { type: ['string', 'null'], default: null },
      kafkaAccessKey: { type: ['string', 'null'], default: null },
      kafkaBootstrapServers: { type: 'string' },
      ssl: { type: 'boolean', default: false }
    },
    configName: env
  });
}

export function loadConfig(command: Command): Config {
  const { env } = command.parent?.opts() || {};
  if (!env) {
    throw new Error('env variable is required in order to load config by env');
  }
  const conf = getConf(env);

  const parseResult = parseConfig({
    kafkaBootstrapServers: conf.get('kafkaBootstrapServers') as string,
    schemaRegistryUrl: conf.get('schemaRegistryUrl') as string,
    kafkaAccessKey: (conf.get('kafkaAccessKey') || undefined) as string,
    kafkaSecretKey: (conf.get('kafkaSecretKey') || undefined) as string,
    schemaRegistryAccessKey: (conf.get('schemaRegistryAccessKey') || undefined) as string,
    schemaRegistrySecretKey: (conf.get('schemaRegistrySecretKey') || undefined) as string,
    ssl: (conf.get('ssl') || false) as boolean
  });

  if (parseResult.error) {
    logger.error('Please set required config options via set-config <configAsJson>:');
    logger.error(clc.red(parseResult.error));
    return process.exit(1);
  }

  return parseResult.value;
}
