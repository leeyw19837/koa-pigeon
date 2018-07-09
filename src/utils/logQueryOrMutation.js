import { IContext } from '../types'

export const logQueryOrMutation = (
  requestType: 'QUERY' | 'MUTATION',
  funcName: string,
  func: (rootValue, args, ctx) => Promise<any>,
) => async (rootValue, args, ctx) => {
  console.log(
    `${requestType}: Calling ${funcName} with args ${JSON.stringify(args)}`,
  )
  return func(rootValue, args, ctx)
}
