// 扁平图标组件：SVG mask + currentColor，颜色自动继承文字色（适配双主题）
// <ui-icon name="heart-fill" size="32" />
// size: 数字按 rpx 处理，也可传 '1em' 等 CSS 值；color: 留空继承

Component({
  properties: {
    name: { type: String, value: '' },
    size: { type: null, value: 40 },
    color: { type: String, value: '' }
  },
  data: {
    styleText: 'font-size:40rpx;'
  },
  observers: {
    'size, color'(size, color) {
      const s = String(size == null ? 40 : size)
      const fs = /^\d+(\.\d+)?$/.test(s) ? s + 'rpx' : s
      this.setData({ styleText: `font-size:${fs};${color ? 'color:' + color + ';' : ''}` })
    }
  }
})
