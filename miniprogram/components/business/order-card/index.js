const { ORDER_STATUS, orderActions } = require('../../../utils/constants')
const time = require('../../../utils/time')

// 订单列表卡：自动根据 role+status 计算状态标签与操作按钮
Component({
  properties: {
    order: { type: Object, value: {} },
    role: { type: String, value: 'buyer' } // buyer 食客视角 | seller 主厨视角
  },
  data: {
    statusInfo: {},
    actions: [],
    timeText: '',
    other: {} // 对方信息快照
  },
  observers: {
    'order, role'(order, role) {
      if (!order || !order.status) return
      const info = ORDER_STATUS[order.status] || {}
      const actions = orderActions(role, order.status, !!(order.review && order.review.rating))
      const other =
        role === 'buyer'
          ? { name: order.sellerName, avatar: order.sellerAvatar }
          : { name: order.buyerName, avatar: order.buyerAvatar }
      this.setData({
        statusInfo: info,
        actions,
        other: other || {},
        timeText: time.short(order.createdAt)
      })
    }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { order: this.data.order })
    },
    onAction(e) {
      const key = e.currentTarget.dataset.key
      this.triggerEvent('action', { key, order: this.data.order })
    }
  }
})
