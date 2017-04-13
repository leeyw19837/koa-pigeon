export default {
  saveFootAssessment: async (_, args, { db }) => {

  //   const record = parse(args.payload)
  //   const { _id: recordId } = record

  //   const result = await db
  //     .collection('footAssessment')
  //     .findOneAndUpdate(
  //     { _id: recordId },
  //     {
  //       ...record,
  //       createdAt: record.createdAt || new Date(),
  //     },
  //     { upsert: true },
  //   )

  //   if (result.ok) {
  //     return {
  //       error: null,
  //       result: stringify(result.value),
  //     }
  //   }
  //   return {
  //     error: 'An error occurred',
  //     result: null,
  //   }
  // },
}
