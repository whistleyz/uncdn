import * as path from 'path'
import * as mime from 'mime'
import * as SRIToolbox from 'sri-toolbox'

mime.define(
  {
    'text/plain': [
      'authors',
      'changes',
      'license',
      'makefile',
      'patents',
      'readme',
      'ts',
      'flow'
    ]
  },
  /* force */ true
)

const textFiles = /\/?(\.[a-z]*rc|\.git[a-z]*|\.[a-z]*ignore|\.lock)$/i

export function getContentType(file) {
  const name = path.basename(file)

  return textFiles.test(name)
    ? 'text/plain'
    : mime.getType(name) || 'text/plain'
}

export function getIntegrity(data) {
  return SRIToolbox.generate({ algorithms: ['sha384'] }, data)
}

export function fixJavascriptContentType (type: string) {
  return type === 'application/javascript' ? type + '; charset=utf-8' : type
}
