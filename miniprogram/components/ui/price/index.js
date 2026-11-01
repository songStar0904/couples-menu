// 心意值展示：❤ + 数字
Component({
  properties: {
    value: { type: null, value: 0 }, // 支持数字或 '免费'
    size: { type: String, value: 'md' }, // sm | md | lg | xl
    free: { type: Boolean, value: false } // true 时显示「免费」
  }
})
