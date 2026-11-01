// 全局常量（与云函数 docs/02-技术方案 错误码保持一致）
// 图标 name 对应 scripts/icons.js 的扁平图标集（ui-icon 组件渲染）

const ERR = {
  NO_COUPLE: 1001,
  ALREADY_BOUND: 1002,
  INSUFFICIENT_POINTS: 1003,
  INVALID_CODE: 1004,
  STATE_CONFLICT: 1005,
  NO_PERMISSION: 1006,
  BAD_PARAM: 1007
}

const ORDER_STATUS = {
  pending: { text: '待接单', icon: 'hourglass', tag: 'warning' },
  accepted: { text: '已接单', icon: 'chef', tag: 'primary' },
  cancel_requested: { text: '申请取消', icon: 'bookmark', tag: 'warning' },
  completed: { text: '已完成', icon: 'check-circle', tag: 'success' },
  cancelled: { text: '已取消', icon: 'x-circle', tag: 'line' }
}

const POINT_TYPE = {
  register: '注册礼包',
  bind: '绑定奖励',
  sign: '每日签到',
  order_pay: '点单支付',
  order_earn: '完成订单',
  refund: '订单退款'
}

const DISH_TYPE = {
  dish: '菜品',
  service: '心意服务'
}

const TYPE_ICON = { dish: 'pan', service: 'gift' }

const CATEGORY_ICON = {
  拿手菜: 'pan',
  心意服务: 'gift',
  甜品饮品: 'cake',
  其他: 'sparkle'
}
function categoryIcon(name) {
  return CATEGORY_ICON[name] || 'sparkle'
}

// 云端 templates 数据里存的是 emoji，渲染时映射为扁平图标
const EMOJI_TO_ICON = {
  '🍱': 'bento',
  '🌅': 'sunrise',
  '🌙': 'moon',
  '🌧️': 'rain',
  '💝': 'gift',
  '🎯': 'target',
  '🍳': 'pan',
  '🍰': 'cake',
  '✨': 'sparkle',
  '🤗': 'users',
  '🎬': 'film',
  '🧹': 'home',
  '📝': 'pencil',
  '🚶': 'map-pin',
  '🎮': 'gamepad',
  '🍮': 'cake',
  '💞': 'heart-fill',
  '❤️': 'heart-fill',
  '🏠': 'home',
  '📖': 'book',
  '🧾': 'receipt',
  '👤': 'user'
}
function emojiToIcon(emoji) {
  return EMOJI_TO_ICON[emoji] || 'sparkle'
}

function defaultCategories() {
  return [
    { name: '拿手菜', sort: 1 },
    { name: '心意服务', sort: 2 },
    { name: '甜品饮品', sort: 3 },
    { name: '其他', sort: 4 }
  ]
}

const DYNAMIC = {
  bind: { icon: 'heart', text: '我们建立了专属小馆' },
  order_create: { icon: 'bell', text: '下了一单' },
  order_accept: { icon: 'chef', text: '接下了一单' },
  order_complete: { icon: 'check-circle', text: '完成了一单' },
  review: { icon: 'chat', text: '留下了一条评价' }
}

const TASKS = [
  { key: 'sign', title: '每日签到', reward: 5, desc: '连续签到满 7 天额外 +10' },
  { key: 'bind', title: '绑定伴侣', reward: 66, desc: '建立你们的专属小馆，双方各 +66' },
  { key: 'first_complete', title: '完成一次订单', reward: 0, desc: '接单并完成，心意值直接入账' }
]

// 发现页「灵感点滴」静态内容
const INSPIRATIONS = [
  { icon: 'users', title: '拥抱券', desc: '限时 30 秒的熊抱，不许玩手机' },
  { icon: 'film', title: 'TA 想看的电影', desc: '由 TA 挑片，爆米花你负责' },
  { icon: 'sunrise', title: '叫 TA 起床', desc: '周末的一声温柔早安' },
  { icon: 'home', title: '家务全包日', desc: '今天碗我来洗，你坐着指挥' },
  { icon: 'mail', title: '手写一封信', desc: '把说不出口的话写下来' },
  { icon: 'map-pin', title: '饭后散步', desc: '小区里走 30 分钟，聊聊最近' },
  { icon: 'gamepad', title: '陪玩一小时', desc: 'TA 玩什么就陪什么' },
  { icon: 'cake', title: '深夜甜品', desc: '睡前的一份小甜点' }
]

// 订单操作按钮矩阵：返回 [{ key, text, type }]，key 与云函数 action 对应
// role: 'buyer' 食客 | 'seller' 主厨
function orderActions(role, status, hasReview) {
  if (role === 'buyer') {
    if (status === 'pending') return [{ key: 'cancel', text: '取消订单', type: 'ghost' }]
    if (status === 'accepted') return [{ key: 'cancel', text: '申请取消', type: 'ghost' }]
    if (status === 'completed' && !hasReview) return [{ key: 'review', text: '感谢 TA', type: 'soft' }]
    return []
  }
  if (status === 'pending') {
    return [
      { key: 'cancel', text: '拒绝', type: 'ghost' },
      { key: 'accept', text: '接单', type: 'primary' }
    ]
  }
  if (status === 'accepted') {
    return [
      { key: 'cancel', text: '取消', type: 'ghost' },
      { key: 'complete', text: '完成', type: 'primary' }
    ]
  }
  if (status === 'cancel_requested') {
    return [
      { key: 'declineCancel', text: '拒绝取消', type: 'ghost' },
      { key: 'confirmCancel', text: '同意取消', type: 'danger' }
    ]
  }
  return []
}

module.exports = {
  ERR,
  ORDER_STATUS,
  POINT_TYPE,
  DISH_TYPE,
  TYPE_ICON,
  CATEGORY_ICON,
  categoryIcon,
  EMOJI_TO_ICON,
  emojiToIcon,
  defaultCategories,
  DYNAMIC,
  TASKS,
  INSPIRATIONS,
  orderActions
}
