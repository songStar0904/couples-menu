Component({
  properties: {
    icon: { type: String, value: '' }, // 图标名，见 scripts/icons.js
    title: { type: String, value: '' },
    label: { type: String, value: '' }, // 副标题
    value: { type: String, value: '' }, // 右侧文本
    arrow: { type: Boolean, value: false },
    hoverable: { type: Boolean, value: true }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
