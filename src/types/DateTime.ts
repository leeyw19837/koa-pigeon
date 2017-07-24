
import { GraphQLScalarType } from 'graphql'
import { GraphQLError } from 'graphql/error'
import { Kind } from 'graphql/language'
let moment = require('moment')


//not finished yet.
function parseDate(value) {
  if (!value)
    throw new TypeError('Invalid date: ' + value)
  try {
    let result = new moment(value)
    return result.toDate()
  } catch (exp) {
    throw new TypeError('Invalid date: ' + value)
  }
}

module.exports = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value) {
    return parseDate(value).toJSON()
  },
  parseValue(value) {
    return parseDate(value)
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError('Query error: Can only parse strings to dates but got a: ' + ast.kind, [ast])
    }
    try {
      return parseDate(ast.value)
    } catch (exp) {
      throw new GraphQLError('Query error: ' + exp.message, [ast])
    }
  }
})