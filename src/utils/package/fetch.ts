import * as url from 'url'
import * as http from 'http'
import * as LRUCache from 'lru-cache'
import * as gunzip from 'gunzip-maybe'
import { bufferStream } from '../buffer'
import { info, error, debug } from '../log'

const npmRegistryURL =
  process.env.NPM_REGISTRY_URL || 'http://registry.npmjs.org'

const agent = new http.Agent({
  keepAlive: true
})

const CACHE_NOTFOUND_PLACEHOLDER = ''
const oneMegabyte = 1024 * 1024
const oneSecond = 1000
const oneMinute = oneSecond * 60
// All the keys that sometimes appear in package info
// docs that we don't need. There are probably more.
const packageConfigExcludeKeys = [
  'browserify',
  'bugs',
  'directories',
  'engines',
  'files',
  'homepage',
  'keywords',
  'maintainers',
  'scripts'
]

const cache = new LRUCache({
  max: oneMegabyte * 40,
  length: Buffer.byteLength,
  maxAge: oneSecond
})

function get(options): Promise<http.IncomingMessage> {
  return new Promise((accept, reject) => {
    http.get(options, accept).on('error', reject)
  })
}

export const isScopedPackage = packageName => packageName.startsWith('@')

export const encodePackageName = packageName => {
  return isScopedPackage(packageName)
    ? `@${encodeURIComponent(packageName.substring(1))}`
    : encodeURIComponent(packageName)
}

export const fetchPackageInfo = async packageName => {
  const infoApi = npmRegistryURL + '/' + encodePackageName(packageName)
  const { hostname, pathname } = url.parse(infoApi)
  const options = {
    agent: agent,
    hostname: hostname,
    path: pathname,
    headers: {
      Accept: 'application/json'
    }
  }
  info('fetching pkgInfo for %s from %s', packageName, infoApi)
  
  const res = await get(options)

  if (res.statusCode === 200) {
    return bufferStream(res).then(buffer => buffer.toString()).then(JSON.parse)
  }

  if (res.statusCode === 404) {
    return null
  }

  const content = (await bufferStream(res)).toString()

  error('Error fetching info for %s (status: %s)', packageName, res.statusCode)
  error(content)

  return null
}

/**
 * Returns an object of available { versions, tags }.
 * Uses a cache to avoid over-fetching from the registry.
 */
export async function getVersionsAndTags(packageName) {
  const cacheKey = `versions-${packageName}`
  const cacheValue = cache.get(cacheKey)

  if (cacheValue != null) {
    return cacheValue === CACHE_NOTFOUND_PLACEHOLDER ? null : JSON.parse(cacheValue)
  }

  const pkgInfo = await fetchPackageInfo(packageName)

  if (pkgInfo && pkgInfo.versions) {
    const result = {
      versions: Object.keys(pkgInfo.versions),
      tags: pkgInfo['dist-tags']
    }
    cache.set(cacheKey, JSON.stringify(result), oneMinute)

    return result
  } else {
    cache.set(cacheKey, CACHE_NOTFOUND_PLACEHOLDER, 5 * oneMinute)
    return null
  }
}

function plainPackageConfig(config) {
  return Object.keys(config).reduce((memo, key) => {
    if (!key.startsWith('_') && !packageConfigExcludeKeys.includes(key)) {
      memo[key] = config[key]
    }
    return memo
  }, {})
}

/**
 * Returns metadata about a package, mostly the same as package.json.
 * Uses a cache to avoid over-fetching from the registry.
 */
export async function getPackageJson (packageName, version) {
  const cacheKey = `config-${packageName}-${version}`
  const cacheValue = cache.get(cacheKey)

  if (cacheValue != null) {
    return cacheValue === CACHE_NOTFOUND_PLACEHOLDER
      ? null
      : JSON.parse(cacheValue)
  }

  const pkgInfo = await fetchPackageInfo(packageName)

  if (pkgInfo && pkgInfo.versions && version in pkgInfo.versions) {
    const config = plainPackageConfig(pkgInfo.versions[version])
    cache.set(cacheKey, JSON.stringify(config), oneMinute)
    return config
  }

  cache.set(cacheKey, CACHE_NOTFOUND_PLACEHOLDER, 5 * oneMinute)

  return null
}

/**
 * Returns a stream of the tarball'd contents of the given package.
 */
export async function loadPackage (packageName, version) {
  const tarballName = isScopedPackage(packageName)
    ? packageName.split('/')[1]
    : packageName
  const tarballURL = `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`
  const { hostname, pathname } = url.parse(tarballURL)
  const options = {
    agent: agent,
    hostname: hostname,
    path: pathname
  }
  
  debug('Fetching package for %s from %s', packageName, tarballURL)
  const res = await get(options)

  if (res.statusCode === 200) {
    const stream = res.pipe(gunzip())
    // stream.pause()
    return stream
  }

  if (res.statusCode === 404) {
    return null
  }

  const content = (await bufferStream(res) as any).toString('utf-8')

  error(
    'Error fetching tarball for %s@%s (status: %s)',
    packageName,
    version,
    res.statusCode
  )
  error(content)

  return null
}
