const app = getApp()
const store = require('../../utils/store')
const theme = require('../../utils/theme')
const time = require('../../utils/time')
const util = require('../../utils/util')
const userService = require('../../services/user')
const coupleService = require('../../services/couple')

Page({
  data: {
    themeClass: '',
    theme: 'pink',
    togetherDate: '',
    notifyOrder: true,
    notifyAccept: true
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onShow() {
    const s = store.get()
    this.setData({
      theme: s.theme || 'pink',
      togetherDate: (s.couple && s.couple.togetherDate) || '',
      notifyOrder: s.user && s.user.settings ? s.user.settings.notifyOrder !== false : true,
      notifyAccept: s.user && s.user.settings ? s.user.settings.notifyAccept !== false : true
    })
  },

  onThemeChange(e) {
    const v = e.detail.value
    store.set({ theme: v })
    theme.apply(this)
    userService.updateSettings({ theme: v }).catch(() => {})
    util.toast(v === 'blue' ? '已切换为雾蓝 💙' : '已切换为暖粉 🌸')
  },

  async onNotifyOrder(e) {
    const v = e.detail.value
    this.setData({ notifyOrder: v })
    try {
      await userService.updateSettings({ notifyOrder: v })
    } catch (err) {
      this.setData({ notifyOrder: !v })
    }
  },

  async onNotifyAccept(e) {
    const v = e.detail.value
    this.setData({ notifyAccept: v })
    try {
      await userService.updateSettings({ notifyAccept: v })
    } catch (err) {
      this.setData({ notifyAccept: !v })
    }
  },

  onAnniversaryChange(e) {
    coupleService.updateTogetherDate(e.detail.value).then(() => {
      const s = store.get()
      store.set({ couple: { ...s.couple, togetherDate: e.detail.value } })
      this.setData({ togetherDate: e.detail.value })
      util.toast('纪念日已更新，现在是在一起第 ' + time.daysFrom(e.detail.value) + ' 天')
    }).catch(() => {})
  },

  onAbout() {
    wx.showModal({
      title: '关于情侣菜单',
      content: 'v1.0\n为两个人打造的专属点餐小馆。\nTA 是你的私厨，你是 TA 的常客。',
      showCancel: false,
      confirmText: '好呀'
    })
  },

  onClearCache() {
    wx.clearStorageSync()
    util.toast('本地缓存已清理')
  }
})
