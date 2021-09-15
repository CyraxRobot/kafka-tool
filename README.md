# kafka-tool

## cli tool to work with kafka and schema registry

## install

```bash
npm i -g kafka-tool
```

## Usage

```bash
kafka-tool set-config '{"kafkaBootstrapServers": "localhost:9092", "schemaRegistryUrl":"http://localhost:8081"}'
```

```typescript
// avalilable config options
// for local development, you could setup only kafkaBootstrapServers and schemaRegistryUrl
type Config = {
  schemaRegistryUrl: string;
  schemaRegistrySecretKey?: string;
  schemaRegistryAccessKey?: string;
  kafkaSecretKey?: string;
  kafkaAccessKey?: string;
  kafkaBootstrapServers: string;
  ssl?: boolean
};
```

### all configs are separated by env (see -e required option)

```bash
❯ kafka-tool
Usage: kafka-tool [options] [command]

ubiquitous tool to work with kafka and schema registry

Options:
  -V, --version                              output the version number
  -e, --env <environment>                    environment to work with
  -h, --help                                 display help for command

Commands:
  list-topics|lt                             list all topics in kafka
  create-topic|ct [options] <topicName>      create new topic
  list-schemas|ls [options] [name]           list all schemas in schema registry
  show-topic|st [options] <topicName>        show all options about given topic
  delete-topic|dt [options] <topicName>      deletes topic by name
  list-groups|lg                             list all groups in kafka
  describe-cluster|dc                        get info about cluster
  reset-offset|ro [options]                  resets offset of given groupId (earliest | latest(default: -1))
  delete-topic-messages|dtm <topicName>      deletes all messages in the given topic
  set-config <json>                          sets config with creadentials for kafka and schema registry
  get-config                                 displays config with credentials
  clear-config                               delete all items in config by env
  delete-schema|ds [options] <schemaName>    deletes schema in schema registry
  set-group-offset|setgo [options]           sets new offsets for a consumer group
  show-group-offset|sgo [options] <groupId>  display group offsets per partition
  help [command]                             display help for command
```
