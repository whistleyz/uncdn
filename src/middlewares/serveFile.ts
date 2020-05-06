import * as Koa from 'koa'
import * as path from 'path'
import * as etag from 'etag'
import { fixJavascriptContentType } from '../utils/file'

export default function serveFile(ctx: Koa.Context) {
  const tags = ['file']
  const ext = path.extname(ctx.entry.path).substr(1)

  if (ext) {
    tags.push(`${ext}-file`)
  }

  ctx.set({
    'Content-Type': fixJavascriptContentType(ctx.entry.contentType),
    'Content-Length': ctx.entry.size,
    'Cache-Control': 'public, max-age=31536000', // 1 year
    'Last-Modified': ctx.entry.lastModified,
    ETag: etag(ctx.entry.content),
    'Cache-Tag': tags.join(', ')
  })
  ctx.body = ctx.entry.content
}
