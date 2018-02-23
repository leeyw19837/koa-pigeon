import { IContext } from '../types'

export const orders = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  return db
    .collection('Orders')
    .find({ patientId: args.patientId })
    .toArray()
}
