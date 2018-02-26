// import { IContext } from '../types'
export const orders = async (_, args, { getDb }) => {
  const db = await getDb()

  return db
    .collection('Orders')
    .find({ patientId: args.patientId })
    .toArray()
}
