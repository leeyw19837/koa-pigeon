import { maybeCreateFromHexString } from '../../utils'

export const whoAmI = async (userId, nosy, participants, db) => {
  let me = participants.find(user => {
    return user.userId === userId
  })
  if (!me) {
    if (nosy) {
      me = participants.find(user => {
        return user.role === '医助'
      })
    } else {
      // 这是一块新屎，有了它nosy参数形同虚设；等participants清洗完以后，再删除掉这个else块
      const user = await db
        .collection('users')
        .findOne({ _id: { $in: [userId, maybeCreateFromHexString(userId)] } })
      if (user && user.roles === '医助') {
        me = participants.find(user => {
          return user.role === '医助'
        })
      }
    }
  }
  return me
}
