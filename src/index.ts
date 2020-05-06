import * as path from 'path'
import * as cors from '@koa/cors'
import * as Koa from 'koa'
import { info, http as httpLog } from './utils/log'
import * as favicon from 'koa-favicon'
import * as validate from 'koa-validate'
import * as koaBody from 'koa-body'
import serve from './middlewares/serve'
import commonMiddleware from './middlewares/common'
import router from './router'

function main (options?) {
  options = {
    port: 8088,
    ...options
  }

  const app = new Koa()

  validate(app)

  app.use(httpLog())
  app.use(favicon())
  app.use(serve('/public', '../public'))
  app.use(cors({ credentials: true, maxAge: 2592000 }))
  app.use(koaBody({ multipart: true }))
  app.use(commonMiddleware)
  app.use(router.routes())
  app.use(router.allowedMethods())

  app.listen(options.port, () => {
    info(`server running at: ${options.port}`)
  })
}

if (!module.parent) {
  main()
}

export default main
