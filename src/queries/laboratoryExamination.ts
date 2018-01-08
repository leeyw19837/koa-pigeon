import moment = require('moment')
import filter = require("lodash/filter")
import get = require("lodash/get")

import { IContext } from '../types'

// 化验结果
export const laboratoryExaminationResults = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  let query = {patientId:args.patientId}

  let sort_clinicalLabResults = {testDate:-1}
  let sort_bodyCheckResults = {caseRecordAt:-1}

  const clinicalLabResults = await db
    .collection('clinicalLabResults')
    .find(query)
    .sort(sort_clinicalLabResults)
    .toArray()

  const bodyCheckResults = await db
  .collection('caseRecord')
  .find(query)
  .sort(sort_bodyCheckResults)
  .toArray()


  bodyCheckResults.map(value=>{
    const medicines = value.caseContent.prescription.medicines
    const newMedicines = filter(medicines,item=>{
      const status = get(item,"status")
      return status!="stop"
    })
    value.caseContent.prescription.medicines = newMedicines
  }) 


  return {clinicalLabResults,bodyCheckResults}
}