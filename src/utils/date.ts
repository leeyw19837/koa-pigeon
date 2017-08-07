import { GraphQLError, GraphQLScalarType, Kind } from 'graphql'

function parseDate(value) {
  const result = new global.Date(value)
  if (isNaN(result.getTime())) {
    throw new TypeError('Invalid date: ' + value)
  }
  if (value !== result.toJSON()) {
    throw new TypeError(
      'Invalid date format, only accepts: YYYY-MM-DDTHH:MM:SS.SSSZ: ' + value,
    )
  }
  return result
}

export const Date = new GraphQLScalarType({
  name: 'Date',
  description: 'Date type',
  serialize(value) {
    if (!(value instanceof global.Date)) {
      throw new TypeError('Field error: value is not an instance of Date')
    }
    if (isNaN(value.getTime())) {
      throw new TypeError('Field error: value is an invalid Date')
    }
    return value.toJSON()
  },
  parseValue(value) {
    if (typeof value !== 'string') {
      throw new TypeError('Field error: value is not an instance of string')
    }
    return parseDate(value)
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        'Query error: Can only parse strings to dates but got a: ' + ast.kind,
        [ast],
      )
    }
    try {
      return parseDate(ast.value)
    } catch (e) {
      throw new GraphQLError('Query error: ' + e.message, [ast])
    }
  },
})
