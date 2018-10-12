import { logger } from '../lib/logger'

export const formatError = error => {
  logger.log({level: 'error', message: error.message, status: error.status })
  return error.message
}
