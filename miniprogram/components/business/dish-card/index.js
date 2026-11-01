const { categoryIcon } = require('../../../utils/constants')

// 菜品卡：order 模式带「点单」按钮，manage 模式带上下架开关（通过 slot）
Component({
  properties: {
    dish: { type: Object, value: {} },
    actionText: { type: String, value: '' },
    showPrice: { type: Boolean, value: true }
  },
  data: {
    icon: 'sparkle'
  },
  observers: {
    dish(d) {
      this.setData({ icon: categoryIcon(d && d.category) })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { dish: this.data.dish })
    },
    onAction() {
      this.triggerEvent('action', { dish: this.data.dish })
    }
  }
})
