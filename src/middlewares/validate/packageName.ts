import * as validateNpmPackageName from 'validate-npm-package-name'
import * as Koa from 'koa'

const hexValue = /^[a-f0-9]+$/i

function isHash(value) {
  return value.length === 32 && hexValue.test(value)
}

/**
 * Reject requests for invalid npm package names.
 */
export default function validatePackageName(ctx: Koa.Context, next: Koa.Next) {
  const packageName = ctx.basicPackgeInfo.packageName
  if (isHash(packageName)) {
    ctx.status = 403
    ctx.refail(`Invalid package name "${packageName}" (cannot be a hash)`)
    return
  }

  const errors = validateNpmPackageName(packageName).errors

  if (errors) {
    const reason = errors.join(', ')
    ctx.status = 403
    ctx.refail(`Invalid package name "${packageName}" (${reason})`)
  }

  return next()
}
