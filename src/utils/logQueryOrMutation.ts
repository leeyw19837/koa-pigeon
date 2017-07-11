import { IContext } from '../types'


export const logQueryOrMutation = (
  requestType: 'QUERY' | 'MUTATION',
  funcName: string,
  func: (rootValue, args, { getDb }: IContext,
) => Promise<any>) =>
  async (rootValue, args, { getDb }: IContext) => {
    console.log(`${requestType}: Calling ${funcName} with args ${JSON.stringify(args)}`)
    return func(rootValue, args, { getDb })
  }
