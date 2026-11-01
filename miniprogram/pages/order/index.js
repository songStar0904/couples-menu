const app = getApp()
const theme = require('../../utils/theme')
const util = require('../../utils/util')
const orderService = require('../../services/order')

Page({
  data: {
    themeClass: '',
    loading: true,
    tab: 'bought', // bought 我点的 | received 点我的
    list: [],
    cursor: null,
    finished: false
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    // 首页「新订单」待办卡跳转过来时，直达「点我的」标签
    const intent = app.globalData.pendingOrderTab
    if (intent) delete app.globalData.pendingOrderTab
    app.waitReady().then(() => {
      if (intent && intent !== this.data.tab) {
        this.setData({ tab: intent, list: [], cursor: null, finished: false })
      }
      this.refresh()
    })
  },

  async refresh() {
    this.setData({ loading: true })
    try {
      const r = await orderService.list({ tab: this.data.tab, cursor: null })
      this.setData({ loading: false, list: r.list, cursor: r.nextCursor, finished: r.finished })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (this.data.finished || this.data.loading) return
    try {
      const r = await orderService.list({ tab: this.data.tab, cursor: this.data.cursor })
      this.setData({
        list: this.data.list.concat(r.list),
        cursor: r.nextCursor,
        finished: r.finished
      })
    } catch (e) { /* 忽略加载更多失败 */ }
  },

  onReachBottom() {
    this.loadMore()
  },

  async onPullDownRefresh() {
    await app.waitReady()
    await this.refresh()
    wx.stopPullDownRefresh()
  },

  onTabChange(e) {
    this.setData({ tab: e.detail.value, list: [], cursor: null, finished: false })
    this.refresh()
  },

  onItemTap(e) {
    const order = e.detail.order
    wx.navigateTo({ url: '/pages/order-detail/index?id=' + order._id })
  },

  onAction(e) {
    const { key, order } = e.detail
    if (key === 'review') {
      wx.navigateTo({ url: '/pages/order-detail/index?id=' + order._id })
      return
    }
    const tips = {
      cancel:
        order.status === 'pending'
          ? '取消后心意值会立即退还'
          : this.data.tab === 'bought'
            ? '向主厨申请取消？需要 TA 同意才会退款'
            : '取消后心意值将退还给 TA'
    }
    const doAction = {
      cancel: () => orderService.cancel(order._id),
      accept: () => orderService.accept(order._id),
      complete: () => orderService.complete(order._id),
      confirmCancel: () => orderService.confirmCancel(order._id),
      declineCancel: () => orderService.declineCancel(order._id)
    }
    this.selectComponent('#dialog')
      .confirm({
        title: { cancel: '确认取消？', accept: '接下这一单？', complete: '完成这一单？', confirmCancel: '同意取消？', declineCancel: '拒绝取消？' }[key],
        content: tips[key] || '',
        confirmText: '确定'
      })
      .then(async (ok) => {
        if (!ok) return
        try {
          await doAction[key]()
          util.vibrate()
          util.toast('操作成功')
          this.refresh()
        } catch (err) { /* 已统一提示 */ }
      })
  }
})
