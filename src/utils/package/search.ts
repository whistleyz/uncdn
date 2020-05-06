import * as path from 'path'
import * as tar from 'tar-stream'
import { getContentType, getIntegrity } from '../file'
import { bufferStream } from '../buffer'

export function createSearch(query) {
  const keys = Object.keys(query).sort()
  const pairs = keys.reduce((memo, key) =>
    memo.concat(
      query[key] == null || query[key] === ''
        ? key
        : `${key}=${encodeURIComponent(query[key])}`
    ),
    []
  )
  return pairs.length ? `?${pairs.join('&')}` : ''
}

export function createPackageURL(
  packageName,
  packageVersion,
  filename,
  query
) {
  let url = `/${packageName}`
  if (packageVersion) url += `@${packageVersion}`
  if (filename) url += filename
  if (query) url += createSearch(query)
  return url
}

export type PackageFileEntry = {
  path: string,
  type: string,
  contentType: string,
  integrity: string,
  lastModified: string,
  size: number,
  content?: Buffer
}

/**
 * Search the given tarball for entries that match the given name.
 * Follows node's resolution algorithm.
 * https://nodejs.org/api/modules.html#modules_all_together
 */
export function searchEntries(stream, filename): Promise<{ matchingEntries: any, foundEntry: any }> {
  // filename = /some/file/name.js or /some/dir/name
  return new Promise((resolve, reject) => {
    const jsEntryFilename = `${filename}.js`
    const jsonEntryFilename = `${filename}.json`
    const matchingEntries = {}
    let foundEntry

    if (filename === '/') {
      foundEntry = matchingEntries['/'] = { name: '/', type: 'directory' }
    }

    stream
      .pipe(tar.extract())
      .on('error', reject)
      .on('entry', async (header, stream, next) => {
        const entry: PackageFileEntry = {
          // Most packages have header names that look like `package/index.js`
          // so we shorten that to just `index.js` here. A few packages use a
          // prefix other than `package/`. e.g. the firebase package uses the
          // `firebase_npm/` prefix. So we just strip the first dir name.
          path: header.name.replace(/^[^/]+/g, ''),
          type: header.type,
          contentType: '',
          integrity: '',
          lastModified: '',
          size: null
        }

        // Skip non-files and files that don't match the entryName.
        if (entry.type !== 'file' || !entry.path.startsWith(filename)) {
          stream.resume()
          stream.on('end', next)
          return
        }

        matchingEntries[entry.path] = entry

        // Dynamically create "directory" entries for all directories
        // that are in this file's path. Some tarballs omit these entries
        // for some reason, so this is the "brute force" method.
        let dir = path.dirname(entry.path)
        while (dir !== '/') {
          if (!matchingEntries[dir]) {
            matchingEntries[dir] = { name: dir, type: 'directory' }
          }
          dir = path.dirname(dir)
        }

        if (
          entry.path === filename ||
          // Allow accessing e.g. `/index.js` or `/index.json`
          // using `/index` for compatibility with npm
          entry.path === jsEntryFilename ||
          entry.path === jsonEntryFilename
        ) {
          if (foundEntry) {
            if (
              foundEntry.path !== filename &&
              (entry.path === filename ||
                (entry.path === jsEntryFilename &&
                  foundEntry.path === jsonEntryFilename))
            ) {
              // This entry is higher priority than the one
              // we already found. Replace it.
              delete foundEntry.content
              foundEntry = entry
            }
          } else {
            foundEntry = entry
          }
        }

        try {
          const content = await bufferStream(stream)

          entry.contentType = getContentType(entry.path)
          entry.integrity = getIntegrity(content)
          entry.lastModified = header.mtime.toUTCString()
          entry.size = content.length

          // Set the content only for the foundEntry and
          // discard the buffer for all others.
          if (entry === foundEntry) {
            entry.content = content
          }

          next()
        } catch (error) {
          next(error)
        }
      })
      .on('finish', () => {
        resolve({
          // If we didn't find a matching file entry,
          // try a directory entry with the same name.
          foundEntry: foundEntry || matchingEntries[filename] || null,
          matchingEntries: matchingEntries
        })
      })
  })
}
