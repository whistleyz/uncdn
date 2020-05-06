import * as Koa from 'koa'
import { createPackageURL } from '../../utils/package/search'
import {
  getModuleFilename,
  getUnpkgFilename,
  getMainFile
} from '../../utils/package/filename'

function getFilename (ctx: Koa.Context) {
  const packageJson = ctx.packageJson
  let filename

  if (ctx.query.module) {
    filename = getModuleFilename(packageJson)
    if (!filename) {
      ctx.status = 404
      ctx.refail(`Package ${ctx.basicPackgeInfo.packageSpec} does not contain an ES module`)
      return
    }
  }

  if (!filename) {
    filename =
      getUnpkgFilename(packageJson) ||
      getMainFile(packageJson) ||
      '/index.js'
  }
  // Redirect to the exact filename so relative imports
  // and URLs resolve correctly.
  ctx.set({
    'Cache-Control': 'public, max-age=31536000', // 1 year
    'Cache-Tag': 'redirect, filename-redirect'
  })
  ctx.redirect(
    createPackageURL(
      ctx.packageName,
      ctx.packageVersion,
      filename.replace(/^[./]*/, '/'),
      ctx.query
    )
  )
}

/**
 * Redirect to the exact filename if the request omits one.
 */
export default async function validateFilename(ctx: Koa.Context, next: Koa.Next) {
  if (!ctx.basicPackgeInfo.filename) {
    return getFilename(ctx)
  }

  return next()
}
