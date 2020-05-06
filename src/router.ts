import * as KoaRouter from 'koa-router'
import noquery from './middlewares/noquery'
import validatePathname from './middlewares/validate/packagePathname'
import validatePackageName from './middlewares/validate/packageName'
import validateVersion from './middlewares/validate/packageVersion'
import getEntry from './middlewares/getEntry'
import serveFile from './middlewares/serveFile'

const router = new KoaRouter()
const browser = new KoaRouter({ prefix: '/browse' })
const api = new KoaRouter({ prefix: '/api' })

api.get('/stats', ctx => {
  ctx.body = 'stats'
})

router
  .use(browser.routes())
  .use(browser.allowedMethods())
  .use(api.routes())
  .use(api.allowedMethods())

router.get('*',
  /**
   * cdn 的地址不接受任何query参数，强制302跳转
   */
  noquery,
  validatePathname,
  validatePackageName,
  validateVersion,
  getEntry,
  serveFile
)

export default router
