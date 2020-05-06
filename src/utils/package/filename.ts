export function getModuleFilename (packageJson) {
  let filename = packageJson.module || packageJson['jsnext:main']

  // https://nodejs.org/api/esm.html#esm_code_package_json_code_code_type_code_field
  if (!filename && packageJson.type === 'module') {
    // Use whatever is in pkg.main or index.js
    filename = packageJson.main || '/index.js'
  }

  if (!filename && packageJson.main && /\.mjs$/.test(packageJson.main)) {
    // Use .mjs file in pkg.main
    filename = packageJson.main
  }

  return filename || null
}

export function getUnpkgFilename (packageJson) {
  return (typeof packageJson.unpkg === 'string' && packageJson.unpkg) || null
}

export function getMainFile (packageJson) {
  return (typeof packageJson.main === 'string' && packageJson.main) || null
}
