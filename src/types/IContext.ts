import { Db } from 'mongodb'

export interface IContext {
  getDb: () => Promise<Db>
}
