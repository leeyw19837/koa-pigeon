import filter from 'lodash/filter'
import get from 'lodash/get'

// 化验结果
export const laboratoryExaminationResults = async (_, args, { getDb }) => {
  const db = await getDb()

  const query = { patientId: args.patientId }

  const sort_clinicalLabResults = { testDate: -1 }
  const sort_bodyCheckResults = { caseRecordAt: -1 }

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

  bodyCheckResults.map(value => {
    const medicines = value.caseContent.prescription.medicines
    const newMedicines = filter(medicines, item => {
      const status = get(item, 'status')
      return status !== 'stop'
    })
    value.caseContent.prescription.medicines = newMedicines
  })

  return { clinicalLabResults, bodyCheckResults }
}
