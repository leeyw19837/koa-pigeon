export const updateBloodGlucoses = async (_, args, context) => {
    const db = await context.getDb()
    const {
        bgId, dataStatus, mTime
    } = args
    let set = {}
    if (dataStatus) set = { ...set, dataStatus }
    if (mTime) set = { ...set, measurementTime: mTime }

    await db.collection('bloodGlucoses').update(
        { _id: bgId }, { $set: set }
    )
    return true
}
