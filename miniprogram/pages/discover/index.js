const theme = require('../../utils/theme')
const { INSPIRATIONS } = require('../../utils/constants')
const discoverService = require('../../services/discover')

Page({
  data: {
    themeClass: '',
    loading: true,
    templates: [],
    filtered: [],
    keyword: '',
    inspirations: INSPIRATIONS
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.fetch()
  },

  async fetch() {
    this.setData({ loading: true })
    try {
      const templates = await discoverService.listTemplates()
      this.setData({ loading: false, templates, filtered: templates })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onSearch(e) {
    const kw = (e.detail.value || '').trim()
    const filtered = kw
      ? this.data.templates.filter(
          (t) =>
            t.title.indexOf(kw) >= 0 ||
            (t.subtitle || '').indexOf(kw) >= 0 ||
            (t.tags || []).some((g) => g.indexOf(kw) >= 0)
        )
      : this.data.templates
    this.setData({ keyword: kw, filtered })
  },

  onTplTap(e) {
    const tpl = e.detail.tpl
    wx.navigateTo({ url: '/pages/template-detail/index?id=' + tpl._id })
  },

  goSubmit() {
    wx.navigateTo({ url: '/pages/template-submit/index' })
  }
})
