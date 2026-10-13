import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

// Оригиналы: photos/<babushka|mama|tetya>/*.jpg|heic|png. Результат: public/photos/<id>/NN.webp
const SRC = 'photos'
const OUT = 'public/photos'
const MAX = 1100
const MANIFEST = 'src/photos.json'

const manifest: Record<string, { src: string; width: number; height: number }[]> = JSON.parse(
  readFileSync(MANIFEST, 'utf8'),
)
const tmp = mkdtempSync(join(tmpdir(), 'photos-'))

for (const id of ['babushka', 'mama', 'tetya']) {
  const dir = join(SRC, id)
  if (!existsSync(dir)) continue
  const files = readdirSync(dir)
    .filter((f) => /\.(heic|heif|jpe?g|png|webp)$/i.test(f))
    .sort()
  if (!files.length) continue
  mkdirSync(join(OUT, id), { recursive: true })
  manifest[id] = []
  for (const [i, file] of files.entries()) {
    let input = join(dir, file)
    // sharp из npm не умеет читать HEIC, поэтому конвертируем через sips (macOS)
    if (/\.hei[cf]$/i.test(file)) {
      const jpg = join(tmp, `${id}-${basename(file, extname(file))}.jpg`)
      execFileSync('sips', ['-s', 'format', 'jpeg', input, '--out', jpg], { stdio: 'ignore' })
      input = jpg
    }
    const name = `${String(i + 1).padStart(2, '0')}.webp`
    const info = await sharp(input)
      .rotate()
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(join(OUT, id, name))
    manifest[id].push({ src: `/photos/${id}/${name}`, width: info.width, height: info.height })
    console.log(`${id}: ${file} -> ${name} (${info.width}x${info.height})`)
  }
}

rmSync(tmp, { recursive: true, force: true })
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log('Готово')
