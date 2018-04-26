import { get, isEmpty, map, uniq, difference } from 'lodash'

export const queryAnalyzer = options => (ctx, next) => {
  return next().then(() => {
    if (ctx.status !== 200 || ctx.header['content-type'] !== 'application/json')
      return

    const body = JSON.parse(ctx.response.body)

    const tracingResolvers = get(
      body,
      'extensions.tracing.execution.resolvers',
      [],
    )
    if (isEmpty(tracingResolvers) || tracingResolvers[0].parentType !== 'Query')
      return

    const returnTypes = difference(
      uniq(
        map(uniq(map(tracingResolvers, 'returnType')), type =>
          type.replace(/[\[\]\!]/g, ''),
        ),
      ),
      get(options, 'ignores', []),
    )
    delete body.extensions
    ctx.set('GQL-Return-Types', returnTypes.join(','))
    ctx.body = body
  })
}
