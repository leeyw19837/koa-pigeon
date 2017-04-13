export default (error: any): never => {
  console.error(`---- Error (${new Date()}:`)
  console.error(JSON.stringify(error))
  console.error('----')
  throw error
}
