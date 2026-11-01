const app = getApp()
const store = require('../../utils/store')
const theme = require('../../utils/theme')
const time = require('../../utils/time')
const { categoryIcon } = require('../../utils/constants')
const menuService = require('../../services/menu')
const orderService = require('../../services/order')
const pointsService = require('../../services/points')
const coupleService = require('../../services/couple')

Page({
  data: {
    themeClass: '',
    loading: true,
    user: null,
    partner: null,
    couple: null,
    greeting: '',
    points: 0,
    todaySigned: false,
    days: 0,
    togetherDate: '',
    sellerPending: 0,
    recommends: [],
    dynamics: []
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    await app.waitReady()
    this.refresh()
  },

  async onPullDownRefresh() {
    await app.waitReady()
    await this.refresh()
    wx.stopPullDownRefresh()
  },

  async refresh() {
    const s = store.get()
    if (!s.user) {
      this.setData({ loading: false })
      return
    }
    const hour = new Date().getHours()
    const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

    this.setData({
      loading: true,
      user: s.user,
      partner: s.partner,
      couple: s.couple,
      points: s.user.points,
      greeting,
      togetherDate: (s.couple && s.couple.togetherDate) || '',
      days: s.couple && s.couple.togetherDate ? time.daysFrom(s.couple.togetherDate) : 0
    })

    try {
      const [partnerMenu, summary, overview, dynamics] = await Promise.all([
        s.couple ? menuService.partner() : Promise.resolve(null),
        orderService.summary(),
        pointsService.overview(),
        coupleService.dynamics({ loading: false, toast: false }).catch(() => [])
      ])

      const dishes = (partnerMenu && partnerMenu.dishes) || []
      const recommends = dishes.slice().sort(() => Math.random() - 0.5).slice(0, 3).map((d) => ({
        _id: d._id,
        name: d.name,
        price: d.price,
        image: d.image,
        icon: categoryIcon(d.category)
      }))

      this.setData({
        loading: false,
        points: overview.balance,
        todaySigned: overview.todaySigned,
        sellerPending: summary.sellerPending || 0,
        myActive: summary.myActive || 0,
        recommends,
        dynamics: dynamics.slice(0, 6)
      })
      store.set({ user: { ...store.get().user, points: overview.balance } })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onSign() {
    pointsService.sign().then((r) => {
      const util = require('../../utils/util')
      util.vibrate()
      util.toast(`签到成功 +${r.reward} ❤`)
      this.refresh()
    }).catch(() => {})
  },

  onAnniversaryChange(e) {
    coupleService.updateTogetherDate(e.detail.value).then(() => {
      const s = store.get()
      store.set({ couple: { ...s.couple, togetherDate: e.detail.value } })
      this.setData({ togetherDate: e.detail.value, days: time.daysFrom(e.detail.value) })
      wx.showToast({ title: '纪念日已更新', icon: 'none' })
    }).catch(() => {})
  },

  goBind() {
    wx.navigateTo({ url: '/pages/bind/index' })
  },
  goPoints() {
    wx.navigateTo({ url: '/pages/points/index' })
  },
  goOrder() {
    // switchTab 不能带参数，用 globalData 传递：新订单在「点我的」标签
    getApp().globalData.pendingOrderTab = 'received'
    wx.switchTab({ url: '/pages/order/index' })
  },
  goMenu() {
    wx.switchTab({ url: '/pages/menu/index' })
  },
  goOrderConfirm(e) {
    const dishId = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/order-confirm/index?dishId=${dishId}` })
  }
})
