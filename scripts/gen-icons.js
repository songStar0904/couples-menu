// 生成 miniprogram/components/ui/icon/index.wxss
// 用法：node scripts/gen-icons.js
// 图标定义见 scripts/icons.js —— 改图标后重新运行本脚本

const fs = require('fs')
const path = require('path')
const icons = require('./icons')

function encode(dataUri) {
  // WXSS url() 内的 data:image/svg+xml 需要严格转义
  return dataUri
    .replace(/%/g, '%25')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/#/g, '%23')
    .replace(/"/g, '%22')
    .replace(/ /g, '%20')
}

function toSvg(inner) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    inner +
    '</svg>'
  )
}

const lines = [
  '/* 自动生成，请勿手改 —— node scripts/gen-icons.js */',
  '/* 用法：mask 镂空 + background-color: currentColor，颜色跟随文字色，天然适配双主题 */',
  '.uii {',
  '  display: inline-block;',
  '  width: 1em;',
  '  height: 1em;',
  '  vertical-align: -0.15em;',
  '  background-color: currentColor;',
  '  -webkit-mask-repeat: no-repeat;',
  '  -webkit-mask-position: center;',
  '  -webkit-mask-size: contain;',
  '  mask-repeat: no-repeat;',
  '  mask-position: center;',
  '  mask-size: contain;',
  '}',
  ''
]

for (const [name, inner] of Object.entries(icons)) {
  const uri = 'data:image/svg+xml,' + encode(toSvg(inner))
  lines.push(`.uii-${name} {`)
  lines.push(`  -webkit-mask-image: url("${uri}");`)
  lines.push(`  mask-image: url("${uri}");`)
  lines.push('}')
  lines.push('')
}

const out = path.join(__dirname, '..', 'miniprogram', 'components', 'ui', 'icon', 'index.wxss')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, lines.join('\n'))
console.log(`generated ${Object.keys(icons).length} icons -> ${path.relative(process.cwd(), out)}`)
