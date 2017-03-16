# TODO

- [x] can get a given days appointments :tick:
- [x] can get a previously completed assessment :tick:
- [x] can create a new assessment :tick:
- [x] can set treatmentstate
- [x] can get blood test results
- [ ] date handling
- [x] composing multiple schema gqls
- [x] Dockerfile
- [x] Docker compose dev environment with watcher
- [x] Docker compose production environment with minimal size
- [ ] Set up build agent which copies code to ci server then runs docker:prod
- [x] Investigate get-graphql-schema and gql2ts to create typings - doesn't seem useful on the server
- [ ] Consider the benefits and challenges of adding typings generation to ci build and publishing to npm for use in typescript client


## to consider
- [ ] use .env? set env_file: .env and - $PORT:$PORT in docker compose