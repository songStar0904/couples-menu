const app = getApp()
const store = require('../../utils/store')
const theme = require('../../utils/theme')
const time = require('../../utils/time')

Page({
  data: {
    themeClass: '',
    loading: true,
    user: null,
    couple: null,
    partner: null,
    days: 0,
    points: 0
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }
    app.waitReady().then(() => {
      const s = store.get()
      this.setData({
        loading: false,
        user: s.user,
        couple: s.couple,
        partner: s.partner,
        days: s.couple && s.couple.togetherDate ? time.daysFrom(s.couple.togetherDate) : 0,
        points: s.user ? s.user.points : 0
      })
    })
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/profile-edit/index' })
  },
  goBind() {
    wx.navigateTo({ url: '/pages/bind/index' })
  },
  goPoints() {
    wx.navigateTo({ url: '/pages/points/index' })
  },
  goOrder() {
    wx.switchTab({ url: '/pages/order/index' })
  },
  goMenu() {
    wx.switchTab({ url: '/pages/menu/index' })
  },
  goSettings() {
    wx.navigateTo({ url: '/pages/settings/index' })
  },
  goDemo() {
    wx.navigateTo({ url: '/pages/demo/index' })
  },

  onShareAppMessage() {
    return {
      title: '我开了一家专属小馆，来当我的常客呀 🍳',
      path: '/pages/home/index'
    }
  }
})
