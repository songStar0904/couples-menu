const theme = require('../../utils/theme')
const util = require('../../utils/util')
const time = require('../../utils/time')
const { ERR } = require('../../utils/constants')
const { TEMPLATES } = require('../../config/notify')
const menuService = require('../../services/menu')
const orderService = require('../../services/order')
const pointsService = require('../../services/points')

Page({
  data: {
    themeClass: '',
    loading: true,
    dish: null,
    balance: 0,
    note: '',
    wishDate: '',
    dateLabels: [],
    dateValues: [],
    dateIndex: 0,
    submitting: false
  },

  async onLoad(options) {
    theme.apply(this)
    const days = time.upcomingDays(7)
    this.setData({
      dateValues: days,
      dateLabels: days.map((d) => `${d.slice(5).replace('-', '/')} ${time.weekDay(d)}`),
      wishDate: days[1] || days[0],
      dateIndex: Math.min(1, days.length - 1)
    })
    try {
      const [partnerMenu, overview] = await Promise.all([
        menuService.partner(),
        pointsService.overview()
      ])
      const dish = (partnerMenu.dishes || []).find((d) => d._id === options.dishId)
      if (!dish) {
        util.toast('菜品不存在或已下架')
        setTimeout(() => wx.navigateBack(), 800)
        return
      }
      this.setData({ loading: false, dish, balance: overview.balance })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
  },
  onDateChange(e) {
    const i = Number(e.detail.value)
    this.setData({ dateIndex: i, wishDate: this.data.dateValues[i] })
  },

  async onSubmit() {
    if (this.data.submitting) return
    const { dish, balance } = this.data
    if (dish.price > balance) {
      this.selectComponent('#dialog').confirm({
        title: '心意值不够啦',
        content: `这道菜需要 ${dish.price} ❤，你当前有 ${balance} ❤。先去签到赚一点？`,
        confirmText: '去赚心意值'
      }).then((ok) => {
        if (ok) wx.navigateTo({ url: '/pages/points/index' })
      })
      return
    }
    this.setData({ submitting: true })
    try {
      await requestSubscribe()
      await orderService.create({
        dishId: dish._id,
        note: this.data.note.trim(),
        wishDate: this.data.wishDate
      })
      util.vibrate()
      util.toast('下单成功，坐等开饭 🛎️')
      setTimeout(() => wx.switchTab({ url: '/pages/order/index' }), 700)
    } catch (e) { /* 已统一提示 */ }
    this.setData({ submitting: false })
  }
})

// 下单前尝试请求订阅消息授权（未配置模板时静默跳过）
async function requestSubscribe() {
  try {
    const ids = [TEMPLATES.NEW_ORDER].filter(Boolean)
    if (!ids.length) return
    await wx.requestSubscribeMessage({ tmplIds: ids })
  } catch (e) { /* 用户拒绝或环境不支持，不阻塞下单 */ }
}
