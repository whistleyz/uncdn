export function bufferStream(stream): Promise<Buffer> {
  const chunks = []

  return new Promise((resolve, reject) =>
    stream
      .on('error', reject)
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks)))
  )
}
