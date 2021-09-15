import clc from 'cli-color';
import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getSchemaRegistryClient, isAxiosError, parseNumber
} from '../utils';

const castNotFoundAsEmptyArray = async (fn: () => Promise<number[]>) => {
  try {
    const data = await fn();
    if (data && !Array.isArray(data)) {
      return [data];
    }
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return [] as number[];
    }
    throw err;
  }
};
export async function deleteSchema(schemaName: string, options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const registry = getSchemaRegistryClient(config);
  const {
    version, permanent
  } = options;
  const parsedVersion = (() => {
    if (version && Number.isNaN(parseNumber(version))) {
      logger.error('version should be an interger');
      return '';
    }
    return `${version ? parseNumber(version) : ''}`;
  })();

  const allSchemasOrByVersion = version ? `/versions/${parsedVersion}` : '';

  try {
    const deletedSchemasVersions: { softDeleted: number[], hardDeleted: number[] } = { softDeleted: [], hardDeleted: [] };
    if (permanent) {
      const softDeletedVersions = await castNotFoundAsEmptyArray(async () => (await registry
        .delete<number[]>(`/subjects/${schemaName}${allSchemasOrByVersion}`))
        .data);
      const hardDeletedVersions = await castNotFoundAsEmptyArray(async () => (await registry
        .delete<number[]>(`/subjects/${schemaName}${allSchemasOrByVersion}?permanent=true`))
        .data);

      deletedSchemasVersions.softDeleted.push(...softDeletedVersions);
      deletedSchemasVersions.hardDeleted.push(...hardDeletedVersions);
    } else {
      const softDeletedVersions = await castNotFoundAsEmptyArray(async () => (await registry
        .delete(`/subjects/${schemaName}${allSchemasOrByVersion}`))
        .data);
      deletedSchemasVersions.softDeleted.push(...softDeletedVersions);
    }
    if (deletedSchemasVersions.hardDeleted.length || deletedSchemasVersions.softDeleted.length) {
      logger.info('Deleted versions', clc.green(JSON.stringify(deletedSchemasVersions)));
      return;
    }
    logger.info('Deleted versions', clc.yellow(JSON.stringify(deletedSchemasVersions)));
  } catch (err) {
    if (isAxiosError(err)) {
      logger.error(err.response?.data);
    } else {
      logger.error(err);
    }
  }
}

export const deleteSchemaCommand = new Command()
  .name('delete-schema')
  .description('deletes schema in schema registry')
  .alias('ds')
  .option('--version <number>', 'schema by version to be deleted')
  .option('--permanent', 'deletes schema permanently', false)
  .argument('<schemaName>', 'schema name to be deleted')
  .action(deleteSchema);
