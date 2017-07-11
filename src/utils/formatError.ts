export const formatError = (error: any): never => {
  console.error(`---- Error (${new Date()}:`)
  console.error(JSON.stringify(error))
  console.error(error.message)
  console.error('----')
  throw error
}
