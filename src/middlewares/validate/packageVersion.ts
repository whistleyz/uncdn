import semver from 'semver'
import * as Koa from 'koa'

import { createPackageURL } from '../../utils/package/search'
import { getPackageJson, getVersionsAndTags } from '../../utils/package/fetch'

function semverRedirect(ctx: Koa.Context, newVersion) {
  const { packageName, filename } = ctx.basicPackgeInfo
  
  ctx.set({
    // 10 mins on CDN, 1 min on clients
    'Cache-Control': 'public, s-maxage=600, max-age=60',
    'Cache-Tag': 'redirect, semver-redirect'
  })
  const redirectTo = createPackageURL(
    packageName,
    newVersion,
    filename,
    ctx.query
  )
  ctx.redirect(redirectTo)
}

async function resolveVersion(packageName, range) {
  const versionsAndTags = await getVersionsAndTags(packageName)

  if (versionsAndTags) {
    const { versions, tags } = versionsAndTags

    if (range in tags) {
      range = tags[range]
    }

    return versions.includes(range)
      ? range
      : semver.maxSatisfying(versions, range)
  }

  return null
}

/**
 * Check the package version/tag in the URL and make sure it's good. Also
 * fetch the package config and add it to req.packageConfig. Redirect to
 * the resolved version number if necessary.
 */
export default async function validateVersion (ctx: Koa.Context, next) {
  const packageName = ctx.basicPackgeInfo.packageName
  const packageVersion = ctx.basicPackgeInfo.packageVersion
  const packageSpec = ctx.basicPackgeInfo.packageSpec
  const version = await resolveVersion(
    packageName,
    packageVersion
  )
  console.log('version', ctx.version)

  if (!version) {
    ctx.status = 404
    ctx.refail(`Cannot find package ${packageSpec}`)
    return
  }

  if (version !== packageVersion) {
    return semverRedirect(ctx, version)
  }

  ctx.packageJson = await getPackageJson(
    packageName,
    packageVersion
  )

  if (!ctx.packageJson) {
    ctx.status = 500
    ctx.refail(`Cannot get config for package ${packageSpec}`)
    return
  }

  return next()
}
