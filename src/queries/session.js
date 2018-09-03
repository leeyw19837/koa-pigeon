export const getSessions = async (_, { chatRoomId }, { getDb }) => {
  const db = await getDb()
  return await db
    .collection('sessions')
    .find({ chatRoomId })
    .toArray()
}
