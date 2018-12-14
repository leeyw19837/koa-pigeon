import { ObjectID } from 'mongodb'

class AppointmentDataService {
  async updateTreatment({ trId, setObj }) {
    const treatment = await db
      .collection('treatmentState')
      .findOne({ _id: apId })
    if (!treatment) {
      throw new Error(`${trId} as _id not find existed treatment!`)
    }
    await db.collection('treatmentState').update(
      { _id: apId },
      {
        $set: { ...setObj, updatedAt: new Date() },
      },
    )
  }
  async updateAppointment({ apId, setObj, isSync, trSetObj }) {
    const appointment = await db
      .collection('appointments')
      .findOne({ _id: apId })
    if (!appointment) {
      throw new Error(`${apId} as _id not find existed appointment!`)
    }
    const { treatmentStateId } = appointment
    await db.collection('appointments').update(
      { _id: apId },
      {
        $set: { ...setObj, updatedAt: new Date() },
      },
    )
    if (isSync) {
      await this.updateTreatment({ trId: treatmentStateId, setObj: trSetObj })
    }
  }
}

const getPinyinUsername = name => {
  const clearName = name.trim()
  const pinyinFull = PinyinHelper.convertToPinyinString(
    clearName,
    '',
    PinyinFormat.WITHOUT_TONE,
  )
  let initial = pinyinFull[0]
  if (!/[A-Za-z]/.test(initial)) {
    initial = '~'
  }
  const pinyin = {
    full: pinyinFull,
    short: PinyinHelper.convertToPinyinString(
      clearName,
      '',
      PinyinFormat.FIRST_LETTER,
    ),
    initial,
  }
  return pinyin
}
export const changeUserProperties = async (_, args) => {
  const { patientId, nickname, source } = args
  const setObj = {
    nickname,
    source,
    updatedAt: new Date(),
  }
  await db.collection('users').update(
    { _id: ObjectID(patientId) },
    {
      $set: {
        ...setObj,
        pinyinName: getPinyinUsername(nickname),
      },
    },
  )
  if (nickname) {
    await db
      .collection('appointments')
      .update({ patientId }, { $set: setObj }, { multi: true })
    await db
      .collection('treatmentState')
      .update({ patientId }, { $set: setObj }, { multi: true })
  }
}
