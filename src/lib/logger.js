import { createLogger, format, transports } from 'winston'
import ElasticWinston from 'winston-elasticsearch'
import elasticsearch  from 'elasticsearch'
const { combine, timestamp, label, prettyPrint } = format

const client = new elasticsearch.Client({
  host: '172.16.0.15:9200',
  log: 'trace',
})

export const logger = createLogger({
  format: combine(
    label({label: 'pigeon'}),
    timestamp(),
    prettyPrint()
  ),
  transports: [new transports.Console(), new ElasticWinston({client})]
})

