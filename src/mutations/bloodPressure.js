import freshId from 'fresh-id';
import moment from 'moment'

export const uploadBloodPressureMeasurement = async (_, args, context) => {
  const db = await context.getDb()
  const {
    patientId,
    systolic,
    diastolic,
    heartRate,
    measurementDeviceAddress,
    measuredAt = moment(),
    manualAddition = false,
  } = args

  const bloodPressureMeasurement = {
    _id: freshId(),
    patientId,
    systolic,
    diastolic,
    heartRate,
    measurementDeviceAddress,
    measuredAt,
    manualAddition
  }
  await db.collection('bloodPressureMeasurements').insertOne(bloodPressureMeasurement)
  return {
    ...bloodPressureMeasurement
  }
}

export const removeBloodPressureMeasurement = async (_, args, context) => {
  const db = await context.getDb();
  const result = await db.collection('bloodPressureMeasurements').remove({_id: args._id})
  return !!result.result.ok;
}
