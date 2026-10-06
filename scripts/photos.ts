import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const SRC = 'photos'
const OUT = 'public/photos'
const MAX = 1600

mkdirSync(OUT, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'photos-'))
const files = readdirSync(SRC)
  .filter((f) => /\.(heic|heif|jpe?g|png|webp)$/i.test(f))
  .sort()

const manifest: { src: string; width: number; height: number }[] = []

for (const [i, file] of files.entries()) {
  let input = join(SRC, file)
  // sharp из npm не умеет читать HEIC, поэтому конвертируем через sips (macOS)
  if (/\.hei[cf]$/i.test(file)) {
    const jpg = join(tmp, `${basename(file, extname(file))}.jpg`)
    execFileSync('sips', ['-s', 'format', 'jpeg', input, '--out', jpg], { stdio: 'ignore' })
    input = jpg
  }
  const name = `photo-${String(i + 1).padStart(2, '0')}.webp`
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(join(OUT, name))
  manifest.push({ src: `photos/${name}`, width: info.width, height: info.height })
  console.log(`${file} -> ${name} (${info.width}x${info.height})`)
}

rmSync(tmp, { recursive: true, force: true })
writeFileSync('src/photos.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`Готово: ${manifest.length} фото`)
