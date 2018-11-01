import moment from 'moment'

export const getAiCallStatus = async (_, { appointmentId }, context) => {
  const startAt = moment().startOf('day')._d
  const endAt = moment().endOf('day')._d
  const db = await context.getDb()
  const aiCallRecords = await db
    .collection('aiCalls')
    .find({
      appointmentId,
      callAt: {
        $gte: startAt,
        $lt: endAt,
      },
    })
    .sort({
      callAt: -1,
    })
    .toArray()
  return aiCallRecords.length ? aiCallRecords[0] : null
}

export const getAiCallRecords = async (_, { appointmentId }, context) => {
  const db = await context.getDb()
  const aiCallRecords = await db
    .collection('aiCalls')
    .find({
      appointmentId,
      status: {
        $in: ['success', 'fail'],
      },
    })
    .sort({
      callAt: -1,
    })
    .toArray()
  return aiCallRecords
}
