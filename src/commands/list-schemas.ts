import { Command } from 'commander';
import logger from 'loglevel';
import { loadConfig } from '../config';
import {
  getSchemaRegistryClient
} from '../utils';

type SchemaRegistryEntry = {
  subject: string,
  version: number,
  id: number,
  schema: string
};
export async function listSchemas(name: string, options: any, command: Command): Promise<void> {
  const config = loadConfig(command);
  const registry = getSchemaRegistryClient(config);
  const schemas: SchemaRegistryEntry[] = (await registry.get('/schemas')).data;
  const {
    namesOnly, schemasOnly, stringifySchema, one
  } = options;

  const parsedSchemas = schemas.map((schema) => ({
    ...schema,
    schema: stringifySchema ? schema.schema : JSON.parse(schema.schema)
  })).filter((schema) => (name ? schema.subject.includes(name) : true));

  const getOneOrArray = (localSchemas: any[]): SchemaRegistryEntry | SchemaRegistryEntry[] => {
    if (one) {
      const [schema] = localSchemas;
      return schema;
    }
    return localSchemas;
  };

  if (namesOnly) {
    const subjects = parsedSchemas.map((schema) => schema.subject);
    return logger.log(JSON.stringify(getOneOrArray(subjects), null, 2));
  }

  if (schemasOnly) {
    const subjects = parsedSchemas.map((schema) => schema.schema);
    return logger.log(JSON.stringify(getOneOrArray(subjects), null, 2));
  }
  return logger.log(JSON.stringify(getOneOrArray(parsedSchemas), null, 2));
}

export const listSchemasCommand = new Command()
  .name('list-schemas')
  .description('list all schemas in schema registry')
  .alias('ls')
  .option('--names-only', 'display only subject names (aka schema names)', false)
  .option('--schemas-only', 'display only schema itself', false)
  .option('--stringify-schema', 'stringifies schema to response', false)
  .option('--one', 'get first matched document from array', false)
  .argument('[name]', 'get schema that matches to given name', false)
  .action(listSchemas);
