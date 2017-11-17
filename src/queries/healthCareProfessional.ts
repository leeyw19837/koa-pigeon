import { IContext } from '../types'

export const professionalLogin = async (_, args, { getDb }: IContext) => {
  const db = await getDb()

  // const clientCodename = context.state.clientCodename
  const { username, password } = args
  if(password !== 'zhufanglu2017') {
    throw new Error('密码错误！')
  }

  const existingDoctor = await db
    .collection('users')
    .findOne({ username })
  if (!existingDoctor) {
    throw new Error('用户不存在！')
  }

  return existingDoctor
}