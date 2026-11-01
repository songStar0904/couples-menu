const { emojiToIcon } = require('../../../utils/constants')

Component({
  properties: {
    tpl: { type: Object, value: {} } // { title, subtitle, emoji, colors:[from,to], items, tags }
  },
  data: {
    coverStyle: '',
    icon: 'sparkle',
    count: 0
  },
  observers: {
    tpl(t) {
      if (!t) return
      const colors = (t.colors && t.colors.length >= 2 && t.colors) || ['#FF8FA9', '#FBC2D4']
      this.setData({
        coverStyle: `background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        icon: emojiToIcon(t.emoji),
        count: (t.items && t.items.length) || 0
      })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { tpl: this.data.tpl })
    }
  }
})
