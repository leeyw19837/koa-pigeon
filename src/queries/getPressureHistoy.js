export const getPressureHistory =async (_,args,context)=> {
  const db = await context.getDb()
  const result=await db.collection('bloodPressureMeasurements').find({ patientId: args.patientId }).sort({measuredAt:-1}).toArray()
  return result
}
