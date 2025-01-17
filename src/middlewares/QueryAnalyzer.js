import { get, isEmpty, map, uniq, difference } from 'lodash'

export const queryAnalyzer = ({ ignores, appendTo }) => (ctx, next) => {
  return next().then(() => {
    if (ctx.status !== 200 || ctx.header['content-type'] !== 'application/json')
      return

    const body = JSON.parse(ctx.response.body)

    const tracingResolvers = get(
      body,
      'extensions.tracing.execution.resolvers',
      [],
    )
    if (
      !isEmpty(tracingResolvers) &&
      tracingResolvers[0].parentType === 'Query'
    ) {
      const returnTypes = difference(
        uniq(
          map(uniq(map(tracingResolvers, 'returnType')), type =>
            type.replace(/[\[\]\!]/g, ''),
          ),
        ),
        ignores || [],
      )
      delete body.extensions
      appendTo === 'HEADER'
        ? ctx.set('GQLTypes', returnTypes.join(','))
        : (body.GQLTypes = returnTypes)
      ctx.body = body
    }
    const effectTypes = ctx.response.header['effect-types']

    if (
      appendTo === 'BODY' &&
      !isEmpty(tracingResolvers) &&
      tracingResolvers[0].parentType === 'Mutation' &&
      !isEmpty(effectTypes)
    ) {
      delete body.extensions
      body.effectTypes = effectTypes.split(',').map(t => t.trim())
      ctx.body = body
    }
  })
}
