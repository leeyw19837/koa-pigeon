import { createLogger, format, transports } from 'winston'
import ElasticWinston from 'winston-elasticsearch'
import elasticsearch  from 'elasticsearch'
const { combine, timestamp, label, prettyPrint } = format

const client = new elasticsearch.Client({
  host: process.env.ELASTIC_HOST || '172.16.0.15:9200',
})

const transportConfig = process.env.ELASTIC_ENABLED ? [new ElasticWinston({client})] : [new transports.Console()]

export const logger = createLogger({
  format: combine(
    label({label: 'pigeon'}),
    timestamp(),
    prettyPrint()
  ),
  transports: transportConfig
})


