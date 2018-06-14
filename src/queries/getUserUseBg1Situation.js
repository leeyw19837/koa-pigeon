import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import {HealthCareTeam} from "../resolvers/healthCareTeam";

export const getUserUseBg1Situation = async (_, args, { getDb }) => {
    console.log('getUserUseBg1Situation called!')
    const db = await getDb()
    let result = {useBg1Situation:false}

    let healthcareTeamId = []
    const user = await db
        .collection('users')
        .find({
            _id:ObjectID.createFromHexString(args.patientId),
            $or:[
                {
                    isUseBg1:true
                },
                {
                    $and:[
                        {$or:[{isUseBg1:false},{isUseBg1:{$exists:false}}]},{notUseBg1Reason:{$exists:true}},{notUseBg1Reason:'gotButNoUse'}
                    ]
                }
            ]
        })
        .toArray()

    if (user && user.length>0){
        result.useBg1Situation = true
    }else {
        result.useBg1Situation = false
    }
    console.log('getUserUseBg1Situation called! result',result)
    return result
}
