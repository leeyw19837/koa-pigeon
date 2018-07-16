export const logQueryOrMutation = (requestType, funcName, func) => async (
  rootValue,
  args,
  ctx,
) => {
  if (funcName !== 'saveFoodContents') {
    console.log(
      `${requestType}: Calling ${funcName} with args ${JSON.stringify(args)}`,
    )
  }
  return func(rootValue, args, ctx)
}
