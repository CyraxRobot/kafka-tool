import { Admin, Kafka, KafkaConfig } from 'kafkajs';

import axios, { AxiosError, AxiosInstance } from 'axios';

export type GetRequiredKeys<T> = { [K in keyof T as (undefined extends T[K] ? never : K)]: T[K] };
export type GetOptionalKeys<T> = { [K in keyof T as (undefined extends T[K] ? K : never)]: T[K] };

export type Config = {
  schemaRegistryUrl?: string;
  schemaRegistrySecretKey?: string;
  schemaRegistryAccessKey?: string;
  kafkaSecretKey: string;
  kafkaAccessKey: string;
  kafkaBootstrapServers: string;
  ssl: boolean;
};

export async function isTopicExists(kafkaAdminClient: Admin, topicName: string): Promise<boolean> {
  const topics = await kafkaAdminClient.listTopics();
  return topics.filter((topic) => topic === topicName).length > 0;
}

export function getSchemaRegistryClient(config: Config): AxiosInstance {
  let auth: false | Record<string, any> = false;
  if (config.schemaRegistryAccessKey && config.schemaRegistrySecretKey) {
    auth = {
      auth: {
        username: config.schemaRegistryAccessKey,
        password: config.schemaRegistrySecretKey
      }
    };
  }
  return axios.create({
    baseURL: config.schemaRegistryUrl,
    headers: {
      accept: 'application/vnd.schemaregistry.v1+json, application/vnd.schemaregistry+json, application/json',
      'content-type': 'application/json'
    },
    ...(auth || {})
  });
}

export function getKafkaClient(config: Config): Kafka {
  let auth: false | Pick<KafkaConfig, 'sasl'> = false;
  if (config.kafkaAccessKey && config.kafkaSecretKey) {
    auth = {
      sasl: {
        mechanism: 'plain',
        username: config.kafkaAccessKey,
        password: config.kafkaSecretKey
      }
    };
  }
  const conf: KafkaConfig = {
    brokers: [config.kafkaBootstrapServers],
    ssl: config.ssl,
    connectionTimeout: 30000,
    ...(auth || {})
  };
  return new Kafka(conf);
}

export function parseNumber(value: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Cannot parse number');
  }
  return parsed;
}

export function isAxiosError(err: any): err is AxiosError {
  return err && typeof err === 'object' && 'isAxiosError' in err;
}
