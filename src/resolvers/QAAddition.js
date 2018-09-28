export const QAAddition = {
  async chatRoom(qaAddition, _, { getDb }) {
    const db = await getDb()
    console.log(qaAddition)
    const chatRoom = await db
      .collection('needleChatRooms')
      .findOne({ 'participants.userId': qaAddition.patientId })
    chatRoom.msgId = qaAddition.msgId
    return chatRoom
  },
}
