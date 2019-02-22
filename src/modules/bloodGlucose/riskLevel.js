import first from 'lodash/first'
import dayjs from 'dayjs'

const calcLevel = (hba1cTooHigh, bgTooHigh) => {
  if (hba1cTooHigh && bgTooHigh) return 0
  else if (!hba1cTooHigh && bgTooHigh) return 1
  else if (hba1cTooHigh && !bgTooHigh) return 2
  else if (!hba1cTooHigh && !bgTooHigh) return 3
}

export const getRiskLevel = async ({
  latestHbA1c,
  task: { measurementRecords, type, patientId },
}) => {
  const latestHbA1cTooHigh = latestHbA1c >= 7
  switch (type) {
    case 'AFTER_MEALS_HIGH': {
      const bgTooHigh = measurementRecords[0].bloodGlucoseValue >= 14 * 18
      return calcLevel(latestHbA1cTooHigh, bgTooHigh)
      break
    }
    case 'EMPTY_STOMACH_HIGH': {
      const thresholdOfTooHigh = 7.5 * 18
      const thisTimeBgTooHigh =
        measurementRecords[0].bloodGlucoseValue >= thresholdOfTooHigh

      const highTaskExistsToday = !!(await db
        .collection('interventionTask')
        .count({
          createdAt: {
            $gt: dayjs()
              .startOf('day')
              .toDate(),
          },
          type,
          patientId,
          riskLevel: { $lte: 1 },
        }))
      // 当天已经存在连续过高的任务，后续不再视为连续过高
      if (highTaskExistsToday) {
        return calcLevel(latestHbA1cTooHigh, false)
      }
      // 本次空腹血糖过高，检查是否连续过高
      if (thisTimeBgTooHigh) {
        let latestEffectiveTreatment = await db
          .collection('treatmentState')
          .find({
            patientId,
            checkIn: true,
            appointmentTime: { $lte: new Date() },
          })
          .sort({ appointmentTime: -1 })
          .limit(1)
          .toArray()
        latestEffectiveTreatment = first(latestEffectiveTreatment)

        const latestTaskCondition = {
          patientId,
          dataStatus: 'ACTIVE',
          measurementTime: 'BEFORE_BREAKFAST',
          measuredAt: {
            $lt: dayjs()
              .startOf('day')
              .toDate(),
          },
        }
        // 有签到过的门诊的患者，取前次测量值的起始日期设置为门诊那天
        if (latestEffectiveTreatment) {
          latestTaskCondition.measuredAt = {
            ...latestTaskCondition.measuredAt,
            $gt: latestEffectiveTreatment.appointmentTime,
          }
        }
        console.log('latestTaskCondition :', latestTaskCondition)
        // 统计一下患者历史上上次门诊至今天之前的最近一次的空腹血糖数据,并取其最高值作为该天的测量值
        const emptyStomachBgsByDay = await db
          .collection('bloodGlucoses')
          .aggregate([
            { $match: latestTaskCondition },
            {
              $project: {
                bloodGlucoseValue: 1,
                measuredDate: {
                  $dateToString: { format: '%Y-%m-%d', date: '$measuredAt' },
                },
              },
            },
            {
              $group: {
                _id: '$measuredDate',
                higherValue: { $max: '$bloodGlucoseValue' },
              },
            },
            { $sort: { measuredDate: -1, bloodGlucoseValue: -1 } },
          ])
          .limit(1)
          .toArray()
        const latestDayTooHigh = first(emptyStomachBgsByDay)
        // 以前未测量过空腹血糖，或者前一天的测量值不高于阈值，认为不连续超高

        console.log('latestDayTooHigh :', latestDayTooHigh)
        if (
          !latestDayTooHigh ||
          latestDayTooHigh.higherValue < thresholdOfTooHigh
        ) {
          return calcLevel(latestHbA1cTooHigh, false)
        }

        // 我终于写完了。。
        return calcLevel(latestHbA1cTooHigh, true)
      }
      return calcLevel(latestHbA1cTooHigh, false)
    }
    default:
      return
  }
}
