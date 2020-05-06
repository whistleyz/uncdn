import * as Koa from 'koa'
import { warn } from '../utils/log'

export default function noquery (ctx: Koa.Context, next) {
  const keys = Object.keys(ctx.query)
  
  if (keys.length) {
    warn('ctx.path was force redirected, because with query')
    return ctx.redirect(ctx.path)
  }
  
  return next()
}
