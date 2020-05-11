import * as url from 'url'
import * as http from 'http'
import * as https from 'https'
import * as LRUCache from 'lru-cache'
import * as gunzip from 'gunzip-maybe'
import { bufferStream } from '../buffer'
import * as fetch from 'node-fetch'
import { info, error, debug } from '../log'

const NPM_REGISTRY = 'http://registry.npmjs.org'
const CNPM_REGISTRY = 'http://r.cnpmjs.org'
const TNPM_REGISTRY = 'http://r.tnpm.oa.com'
const npmRegistryURL =
  process.env.NPM_REGISTRY_URL || TNPM_REGISTRY

const httpAgent = new http.Agent({ keepAlive: true })
const httpsAgent = new https.Agent({ keepAlive: true })

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

function get(url, options?) {
  return fetch(url, {
    headers: {
      Accept: 'application/json'
    },
    ...options,
    agent: _parsedURL => _parsedURL.protocol === 'http:' ? httpAgent : httpsAgent
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
  // const { hostname, pathname } = url.parse(infoApi)
  info(`fetching pkgInfo for ${packageName} from ${infoApi}`)
  
  const res = await get(infoApi)

  if (res.status === 200) {
    return res.json()
  }

  if (res.status === 404) {
    return null
  }

  const content = await res.text()

  error(`Error fetching info for ${packageName} (status: ${res.status})`)
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
export async function loadPackage (packageName, version, tarballURL?) {
  if (!tarballURL) {
    const tarballName = isScopedPackage(packageName)
      ? packageName.split('/')[1]
      : packageName
    tarballURL = `${npmRegistryURL}/${packageName}/-/${tarballName}-${version}.tgz`
  }
  
  info(`Fetching package for ${packageName} from ${tarballURL}`)
  const res = await get(tarballURL)
  if (res.status === 200) {
    const stream = res.body.pipe(gunzip())
    // stream.pause()
    return stream
  }

  if (res.status === 404) {
    return null
  }

  const content = await res.text()

  error(
    `Error fetching tarball for ${packageName}@${version} (status: ${res.status})`
  )
  error(content)

  return null
}
