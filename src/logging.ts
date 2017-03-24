export const log = (message, f) => (parent, args, context) => {
  console.log(`${new Date()}: ${message} called with args: ${JSON.stringify(args)}\n`)
  return f(parent, args, context)
}
