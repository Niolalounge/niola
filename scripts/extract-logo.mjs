import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync, inflateSync } from 'node:zlib'

const source = readFileSync('public/images/logo/Niola logo.pdf')
const imageMarker = source.indexOf(Buffer.from('/Subtype/Image'))

if (imageMarker < 0) {
  throw new Error('No embedded image was found in the Niola logo PDF.')
}

const streamStart = source.indexOf(Buffer.from('stream\r\n'), imageMarker) + 8
const streamEnd = source.indexOf(Buffer.from('\r\nendstream'), streamStart)
const pixels = inflateSync(source.subarray(streamStart, streamEnd))
const sourceWidth = 801
const sourceHeight = 636

if (pixels.length !== sourceWidth * sourceHeight * 3) {
  throw new Error(`Unexpected logo image length: ${pixels.length}`)
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const value of buffer) {
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, checksum])
}

const crop = { x: 132, y: 268, width: 502, height: 174 }
const header = Buffer.alloc(13)
const width = crop.width
const height = crop.height
header.writeUInt32BE(width, 0)
header.writeUInt32BE(height, 4)
header[8] = 8
header[9] = 6

const scanlines = Buffer.alloc((width * 4 + 1) * height)
for (let row = 0; row < height; row += 1) {
  const target = row * (width * 4 + 1) + 1
  for (let column = 0; column < width; column += 1) {
    const sourceOffset = ((crop.y + row) * sourceWidth + crop.x + column) * 3
    const targetOffset = target + column * 4
    const red = pixels[sourceOffset]
    const green = pixels[sourceOffset + 1]
    const blue = pixels[sourceOffset + 2]
    const redGreenDelta = red - green
    const greenBlueDelta = green - blue
    const isLogoGold = redGreenDelta > 2 && greenBlueDelta > 4
    const estimatedCoverage = Math.min(
      1,
      Math.max(0, (redGreenDelta / 48 + greenBlueDelta / 114) / 2),
    )
    const alpha = isLogoGold ? Math.round(estimatedCoverage * 255) : 0
    scanlines[targetOffset] = red
    scanlines[targetOffset + 1] = green
    scanlines[targetOffset + 2] = blue
    scanlines[targetOffset + 3] = alpha
  }
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(scanlines, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

writeFileSync('public/images/logo/niola-logo.png', png)
console.log('Extracted public/images/logo/niola-logo.png')
