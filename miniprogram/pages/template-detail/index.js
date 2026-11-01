const theme = require('../../utils/theme')
const util = require('../../utils/util')
const { EMOJI_TO_ICON, emojiToIcon } = require('../../utils/constants')
const discoverService = require('../../services/discover')

Page({
  data: {
    themeClass: '',
    loading: true,
    tpl: null,
    coverStyle: '',
    coverIcon: 'sparkle',
    items: [],
    importing: false
  },

  onLoad(options) {
    theme.apply(this)
    this._id = options.id
    this.fetch()
  },

  async fetch() {
    try {
      const tpl = await discoverService.templateDetail(this._id)
      const colors = (tpl.colors && tpl.colors.length >= 2 && tpl.colors) || ['#FF8FA9', '#FBC2D4']
      this.setData({
        loading: false,
        tpl,
        coverStyle: `background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        coverIcon: emojiToIcon(tpl.emoji),
        items: (tpl.items || []).map((it) => ({
          ...it,
          // 模板条目：优先用数据里的 emoji 映射，无匹配时按类型给图标
          icon: (it.emoji && EMOJI_TO_ICON[it.emoji]) || (it.type === 'service' ? 'gift' : 'pan')
        }))
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  async onImport() {
    if (this.data.importing) return
    const ok = await this.selectComponent('#dialog').confirm({
      title: '导入这份模板？',
      content: '模板里的菜品会加入「我的菜单」，同名菜品自动跳过',
      confirmText: '一键导入'
    })
    if (!ok) return
    this.setData({ importing: true })
    try {
      const r = await discoverService.importTemplate(this._id)
      util.vibrate()
      util.toast(`已导入 ${r.imported} 道菜品 🎉`)
      setTimeout(() => wx.switchTab({ url: '/pages/menu/index' }), 800)
    } catch (e) { /* 已统一提示 */ }
    this.setData({ importing: false })
  }
})
