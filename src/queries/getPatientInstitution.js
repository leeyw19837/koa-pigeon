import { ObjectID } from 'mongodb'
import { IContext } from '../types'
import {HealthCareTeam} from "../resolvers/healthCareTeam";

const healthCareTeams = {
    healthCareTeam1:'BEIDAYIYUAN',
    healthCareTeam2:'LUHEYIYUAN',
    healthCareTeam3:'CHAOYANGYIYUAN',
    healthCareTeam5:'SHOUGANGYIYUAN',
    healthCareTeam4:'OTHERS',
    healthCareTeam:'OTHERS',
}

export const getPatientInstitution = async (_, args, { getDb }) => {
    const db = await getDb()
    let result = {institutionName:'EMPTY'}
    let healthcareTeamId = []
    const user = await db
        .collection('users')
        .find({_id:ObjectID.createFromHexString(args.patientId)})
        .toArray()
    if (user && user.length>0){
        healthcareTeamId = user[0].healthCareTeamId
        if (healthcareTeamId && healthcareTeamId.length>0){
            result.institutionName = healthCareTeams[healthcareTeamId[0]]
        }else {
            result.institutionName = 'OTHERS'
        }
    }else {
        result.institutionName = 'OTHERS'
    }
    return result
}
