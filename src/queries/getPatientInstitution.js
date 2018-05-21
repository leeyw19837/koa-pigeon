import { ObjectID } from 'mongodb'
import { IContext } from '../types'

export const getPatientInstitution = async (_, args, { getDb }) => {
    const db = await getDb()
    let result = {institutionName:'EMPTY'}
    const user = await db
        .collection('users')
        .find({_id:ObjectID.createFromHexString(args.patientId)})
        .toArray()
    if (user && user.length>0){
        result.institutionName = user[0].institutionId
    }else {
        result.institutionName = 'lalalala'
    }
    return result
}
