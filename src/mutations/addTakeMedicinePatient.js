export const addTakeMedicinePatient = async (_, args, context) => {
  const { outpatientId } = args
  const outpatient = await db
    .collection('outpatients')
    .findOne({ _id: outpatientId })
  console.log('======>>>>>outpatient', outpatient)
}
