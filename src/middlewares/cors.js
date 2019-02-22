import convert from 'koa-convert'
import cors from 'koa-cors'

export const useCors = () => App.use(convert(cors()))
