import { program } from 'commander';
import logger from 'loglevel';
import fs from 'fs';
import path from 'path';
import { listSchemasCommand } from './commands/list-schemas';
import { listTopicsCommand } from './commands/list-topics';
import { createTopicCommand } from './commands/create-topic';
import { deleteTopicCommand } from './commands/delete-topic';
import { showTopicCommand } from './commands/show-topic';
import { showGroupOffsetCommand } from './commands/show-group-offset';
import { listGroupsCommand } from './commands/list-groups';
import { describeClusterCommand } from './commands/describe-cluster';
import { resetOffsetCommand } from './commands/reset-offset';
import { deleteTopicMessagesCommand } from './commands/delete-topic-messages';
import { setConfigCommand } from './commands/set-config';
import { getConfigCommand } from './commands/get-config';
import { clearConfigCommand } from './commands/clear-config';
import { deleteSchemaCommand } from './commands/delete-schema';
import { setGroupOffsetCommand } from './commands/set-group-offset';

const getVersion = (): string => {
  const packageJson = fs.readFileSync(path.join(__dirname, '../package.json'), { encoding: 'utf8' });
  return JSON.parse(<any>packageJson).version;
};

logger.setDefaultLevel(1);
program
  .name('kafka-tool')
  .description('ubiquitous tool to work with kafka and schema registry')
  .version(getVersion())
  .requiredOption('-e, --env <environment>', 'environment to work with')
  .addCommand(listTopicsCommand)
  .addCommand(createTopicCommand)
  .addCommand(listSchemasCommand)
  .addCommand(showTopicCommand)
  .addCommand(deleteTopicCommand)
  .addCommand(listGroupsCommand)
  .addCommand(describeClusterCommand)
  .addCommand(resetOffsetCommand)
  .addCommand(deleteTopicMessagesCommand)
  .addCommand(setConfigCommand)
  .addCommand(getConfigCommand)
  .addCommand(clearConfigCommand)
  .addCommand(deleteSchemaCommand)
  .addCommand(setGroupOffsetCommand)
  .addCommand(showGroupOffsetCommand);

export async function run(): Promise<void> {
  await program.parseAsync(process.argv);
  if (!process.argv.length) {
    program.outputHelp();
  }
}

if (require.main === module) {
  run().catch((err) => logger.error(err));
}
