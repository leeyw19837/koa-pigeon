export const formatError = error => {
  console.error(`---- Error (${new Date()}:`)
  console.error(JSON.stringify(error))
  console.error(error.message)
  console.error('----')
  return error.message
}
