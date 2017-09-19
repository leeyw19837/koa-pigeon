import { ObjectId } from 'mongodb'

export const maybeCreateFromHexString = s => {
  try {
    return ObjectId.createFromHexString(s)
  } catch (e) {
    return s
  }
}
