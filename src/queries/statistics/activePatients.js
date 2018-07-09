import moment from 'moment'

export const activePatients = async (_, args, { getDb }) => {
  const db = await getDb()

  const dataPoints = []

  let statisticDate = new Date('2016-10-15')

  while (statisticDate.getTime() < new Date().getTime()) {
    const patientCount = db.collection('appointments').count({
      type: 'first',
      appointmentTime: { $lt: statisticDate },
      isOutPatient: true,
    })

    dataPoints.push({
      x: Number(moment(statisticDate).format('YYYYMMDD')),
      y: patientCount,
    })

    statisticDate = new Date(statisticDate.getTime() + 7 * 24 * 3600 * 1000)
  }

  return dataPoints
}
