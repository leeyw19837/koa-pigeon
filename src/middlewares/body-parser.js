import bodyParser from 'koa-bodyparser'

export const useBodyParser = () =>
  App.use(
    bodyParser({
      jsonLimit: '30mb',
      enableTypes: ['json', 'form', 'text'],
      extendTypes: {
        text: ['text/xml', 'application/xml'],
      },
    }),
  )
