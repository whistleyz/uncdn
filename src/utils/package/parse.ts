import { get } from 'lodash'

const REGEXP_PATHNAME = /^\/((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(\/.*)?$/

const PackageParse = {
  parsePathname (pathname: string) {
    try {
      pathname = decodeURIComponent(pathname)
    } catch (error) {
      return null
    }
  
    const match = REGEXP_PATHNAME.exec(pathname)
  
    // Disallow invalid pathnames.
    if (match == null) return null
  
    const packageName = match[1]
    const packageVersion = match[2] || 'latest'
    const filename = (match[3] || '').replace(/\/\/+/g, '/')
  
    return {
      // If the pathname is /@scope/name@version/file.js:
      packageName, // @scope/name
      packageVersion, // version
      packageSpec: `${packageName}@${packageVersion}`, // @scope/name@version
      filename // /file.js
    }
  },
  getTarballFromPackageJson (packageJson) {
    return get(packageJson, 'dist.tarball')
  }
}

export default PackageParse
