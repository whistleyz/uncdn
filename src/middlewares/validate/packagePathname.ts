import * as Koa from 'koa'
import parse from '../../utils/package/parse'
import { BasicPackge } from '../../types/package'

/**
 * Parse the pathname in the URL. Reject invalid URLs.
 */
export default function validatePathname(ctx: Koa.Context, next: Koa.Next) {
  const parsed = parse.parsePathname(ctx.path)
  
  if (parsed == null) {
    ctx.status = 403
    ctx.refail(null, null, { error: `Invalid URL: ${ctx.path}` })
    return
  }

  const basicPackgeInfo: BasicPackge = {
    packageName: parsed.packageName,
    packageVersion: parsed.packageVersion,
    packageSpec: parsed.packageSpec,
    filename: parsed.filename
  }

  ctx.basicPackgeInfo = basicPackgeInfo

  return next()
}
