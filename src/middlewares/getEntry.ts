import { resolve } from 'path'
import * as Koa from 'koa'
import { loadPackage } from '../utils/package/fetch'
import { searchEntries, createPackageURL } from '../utils/package/search'
import PackageParse from '../utils/package/parse'

/**
 * Fetch and search the archive to try and find the requested file.
 * Redirect to the "index" file if a directory was requested.
 */
async function getEntry(ctx: Koa.Context, next) {
  const tarball = PackageParse.getTarballFromPackageJson(ctx.packageJson)
  const { packageName, packageVersion, filename, packageSpec } = ctx.basicPackgeInfo
  const stream = await loadPackage(packageName, packageVersion, tarball)
  const { foundEntry: entry, matchingEntries: entries } = await searchEntries(
    stream,
    filename
  )

  if (!entry) {
    ctx.status = 404
    ctx.set({
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Cache-Tag': 'missing, missing-entry'
    })
    ctx.refail(`Cannot find "${filename}" in ${packageSpec}`)
    return
  }

  if (entry.type === 'file' && entry.path !== filename) {
    // Redirect to the file with the extension so it's
    // clear which file is being served.
    ctx.set({
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Cache-Tag': 'redirect, file-redirect'
    })
    ctx.redirect(
      createPackageURL(
        packageName,
        packageVersion,
        entry.path,
        ctx.query
      )
    )
    return
  }

  if (entry.type === 'directory') {
    // We need to redirect to some "index" file inside the directory so
    // our URLs work in a similar way to require("lib") in node where it
    // uses `lib/index.js` when `lib` is a directory.
    const indexEntry =
      entries[resolve(filename, '/index.js')] ||
      entries[resolve(filename, '/index.json')]

    if (indexEntry && indexEntry.type === 'file') {
      // Redirect to the index file so relative imports
      // resolve correctly.
      ctx.set({
        'Cache-Control': 'public, max-age=31536000', // 1 year
        'Cache-Tag': 'redirect, index-redirect'
      })
      ctx.redirect(
        createPackageURL(
          packageName,
          packageVersion,
          indexEntry.path,
          ctx.query
        )
      )
      return
    }
    ctx.status = 404
    ctx.set({
      'Cache-Control': 'public, max-age=31536000', // 1 year
      'Cache-Tag': 'missing, missing-index'
    })
    ctx.refail(`Cannot find an index in "${filename}" in ${packageSpec}`)
    return
  }

  ctx.entry = entry

  return next()
}

export default getEntry
