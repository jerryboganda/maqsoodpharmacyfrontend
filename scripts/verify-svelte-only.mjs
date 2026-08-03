import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const excludedDirectories = new Set(['.git', '.svelte-kit', 'build', 'node_modules', 'test-results'])
const sourceExtensions = new Set(['.cjs', '.js', '.mjs', '.svelte', '.ts'])
const legacyExtensions = new Set(['.jsx', '.tsx'])
const forbiddenPackages = new Set([
  '@types/react',
  '@types/react-dom',
  '@vitejs/plugin-react',
  'react',
  'react-dom',
  'react-router',
  'react-router-dom',
])
const forbiddenImports = [
  /(?:from\s+|import\s*)['"]react(?:\/[^'"]*)?['"]/,
  /(?:from\s+|import\s*)['"]react-dom(?:\/[^'"]*)?['"]/,
  /(?:from\s+|import\s*)['"]react-router(?:-dom)?(?:\/[^'"]*)?['"]/,
  /require\(\s*['"]react(?:-dom|-router|-router-dom)?(?:\/[^'"]*)?['"]\s*\)/,
]

const findings = []

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    const relative = path.relative(root, absolute)
    if (entry.isDirectory()) {
      await walk(absolute)
      continue
    }
    const extension = path.extname(entry.name).toLowerCase()
    if (legacyExtensions.has(extension)) findings.push(`${relative}: legacy ${extension} source file`)
    if (!sourceExtensions.has(extension)) continue
    const content = await readFile(absolute, 'utf8')
    if (forbiddenImports.some((pattern) => pattern.test(content))) findings.push(`${relative}: forbidden framework import or require`)
  }
}

await walk(root)

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const dependency of Object.keys(packageJson[section] ?? {})) {
    if (forbiddenPackages.has(dependency)) findings.push(`package.json: ${section}.${dependency}`)
  }
}

if (findings.length) {
  console.error(`Svelte-only gate failed with ${findings.length} finding(s):`)
  for (const finding of findings) console.error(`- ${finding}`)
  process.exitCode = 1
} else {
  console.log('Svelte-only gate passed: 0 legacy source files, imports, or package declarations.')
}
