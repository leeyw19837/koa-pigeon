import { logger } from '../common'

export const formatError = (error, ctx) => {
  logger.log({
    level: 'error',
    message: error.message,
    status: error.status,
    context: ctx,
  })
  return error.message
}
