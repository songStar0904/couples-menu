const theme = require('../../utils/theme')
const util = require('../../utils/util')
const time = require('../../utils/time')
const { ORDER_STATUS, orderActions } = require('../../utils/constants')
const orderService = require('../../services/order')

Page({
  data: {
    themeClass: '',
    loading: true,
    order: null,
    role: 'buyer',
    statusInfo: {},
    actions: [],
    steps: [],
    canReview: false,
    rating: 5,
    reviewText: '',
    submittingReview: false
  },

  onLoad(options) {
    this._id = options.id
    theme.apply(this)
  },

  onShow() {
    this.fetch()
  },

  async fetch() {
    try {
      const r = await orderService.detail(this._id)
      const o = r.order
      const hasReview = !!(o.review && o.review.rating)
      this.setData({
        loading: false,
        order: o,
        role: r.role,
        statusInfo: ORDER_STATUS[o.status] || {},
        actions: orderActions(r.role, o.status, hasReview).filter((a) => a.key !== 'review'),
        steps: this.buildSteps(o),
        canReview: r.role === 'buyer' && o.status === 'completed' && !hasReview
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  buildSteps(o) {
    const steps = [{ icon: 'bell', text: '下单成功', time: time.short(o.createdAt) }]
    if (o.acceptedAt) steps.push({ icon: 'chef', text: '主厨已接单', time: time.short(o.acceptedAt) })
    if (o.status === 'cancel_requested') {
      steps.push({ icon: 'bookmark', text: '食客申请取消，等待主厨处理', time: time.short(o.updatedAt) })
    }
    if (o.completedAt) steps.push({ icon: 'check-circle', text: '订单完成，心意值已入账', time: time.short(o.completedAt) })
    if (o.status === 'cancelled') steps.push({ icon: 'x-circle', text: '订单已取消，心意值已退还', time: time.short(o.updatedAt) })
    return steps
  },

  onAction(e) {
    const key = e.currentTarget.dataset.key
    const tips = {
      cancel:
        this.data.order.status === 'pending'
          ? '取消后心意值会立即退还'
          : this.data.role === 'buyer'
            ? '向主厨申请取消？需要 TA 同意才会退款'
            : '取消后心意值将退还给 TA'
    }
    const doAction = {
      cancel: () => orderService.cancel(this._id),
      accept: () => orderService.accept(this._id),
      complete: () => orderService.complete(this._id),
      confirmCancel: () => orderService.confirmCancel(this._id),
      declineCancel: () => orderService.declineCancel(this._id)
    }
    this.selectComponent('#dialog')
      .confirm({
        title: { cancel: '确认取消？', accept: '接下这一单？', complete: '完成这一单？', confirmCancel: '同意取消？', declineCancel: '拒绝取消？' }[key],
        content: tips[key] || ''
      })
      .then(async (ok) => {
        if (!ok) return
        try {
          await doAction[key]()
          util.vibrate()
          util.toast('操作成功')
          this.fetch()
        } catch (err) { /* 已统一提示 */ }
      })
  },

  onRate(e) {
    this.setData({ rating: Number(e.currentTarget.dataset.v) })
  },
  onReviewText(e) {
    this.setData({ reviewText: e.detail.value })
  },
  async onSubmitReview() {
    if (this.data.submittingReview) return
    this.setData({ submittingReview: true })
    try {
      await orderService.review(this._id, {
        rating: this.data.rating,
        message: this.data.reviewText.trim()
      })
      util.vibrate()
      util.toast('感谢已送达 💕')
      this.fetch()
    } catch (e) { /* 已统一提示 */ }
    this.setData({ submittingReview: false })
  }
})
