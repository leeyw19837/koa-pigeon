import {
  GraphQLError
} from 'graphql';

export const userAuth = user => {
  if (!user) {
    throw new GraphQLError('AuthenticationError', );
  }
}