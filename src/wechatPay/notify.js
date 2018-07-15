export const payNotify = async (ctx, next) => {
  let info = ctx.request.weixin
  console.log(info, '@info')
  ctx.reply('')
}
