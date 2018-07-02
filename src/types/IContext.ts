import { Db } from 'mongodb'

export interface IContext {
  getDb: () => Promise<Db>
  jwtsign: (payload: any) => string
  [key: string]: any
}
