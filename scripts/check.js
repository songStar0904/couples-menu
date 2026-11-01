// 工程一致性检查脚本：node scripts/check.js
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MP = path.join(ROOT, 'miniprogram')
let bad = 0
const problems = []

function exists(p) {
  return fs.existsSync(p)
}

const app = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'))

// 1. 页面四件套
for (const p of app.pages) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    if (!exists(path.join(MP, p + '.' + ext))) {
      problems.push('MISSING page file: ' + p + '.' + ext)
      bad++
    }
  }
}

// 2. 全局组件四件套
for (const [name, compPath] of Object.entries(app.usingComponents || {})) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    if (!exists(path.join(MP, compPath + '.' + ext))) {
      problems.push('MISSING component file: ' + name + ' ' + compPath + '.' + ext)
      bad++
    }
  }
}

// 3. tabBar
if (!app.tabBar || !app.tabBar.custom) {
  problems.push('tabBar.custom != true')
  bad++
}
if (app.tabBar.list.length !== 5) {
  problems.push('tabBar list != 5')
  bad++
}
for (const t of app.tabBar.list) {
  if (!exists(path.join(MP, t.pagePath + '.js'))) {
    problems.push('MISSING tab page: ' + t.pagePath)
    bad++
  }
}

// 4. 页面 wxml 里用到的自定义组件是否都已注册（全局 usingComponents）
const registered = new Set(Object.keys(app.usingComponents || {}))
for (const p of app.pages) {
  const wxml = fs.readFileSync(path.join(MP, p + '.wxml'), 'utf8')
  const pageJson = JSON.parse(fs.readFileSync(path.join(MP, p + '.json'), 'utf8'))
  for (const [k, v] of Object.entries(pageJson.usingComponents || {})) registered.add(k)
  const tags = wxml.match(/<(ui-[a-z-]+|dish-card|order-card|dynamics-item|template-card|sign-calendar|points-badge)/g) || []
  for (const t of new Set(tags)) {
    const name = t.slice(1)
    if (!registered.has(name)) {
      problems.push(`page ${p} uses unregistered component <${name}>`)
      bad++
    }
  }
}

// 5. services 引用的云函数名存在
const cfDir = path.join(ROOT, 'cloudfunctions')
const serviceFiles = fs.readdirSync(path.join(MP, 'services'))
for (const sf of serviceFiles) {
  const src = fs.readFileSync(path.join(MP, 'services', sf), 'utf8')
  const calls = src.match(/call\('([a-z]+)'/g) || []
  for (const c of new Set(calls)) {
    const fn = c.match(/call\('([a-z]+)'/)[1]
    if (!exists(path.join(cfDir, fn, 'index.js'))) {
      problems.push(`service ${sf} references missing cloud function: ${fn}`)
      bad++
    }
  }
}

// 6. 云函数 package.json 都存在
for (const d of fs.readdirSync(cfDir)) {
  if (!exists(path.join(cfDir, d, 'package.json'))) {
    problems.push('cloud function missing package.json: ' + d)
    bad++
  }
}

if (bad === 0) {
  console.log('=== CHECKS PASSED: pages=' + app.pages.length + ' components=' + Object.keys(app.usingComponents).length + ' ===')
} else {
  console.log(problems.join('\n'))
  console.log('=== ' + bad + ' PROBLEMS ===')
  process.exit(1)
}
