const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 订阅消息模板 ID：上线前在 mp 后台申请并填入（与 miniprogram/config/notify.js 保持一致）
// 体验版调试时 miniprogramState 用 'trial'，正式版改 'formal'
const TEMPLATES = {
  NEW_ORDER: '', // 订单提醒（通知主厨）
  ACCEPTED: '', // 接单提醒（通知食客）
  COMPLETED: '', // 完成提醒（通知食客）
  CANCEL: '' // 取消提醒
}
const MINIPROGRAM_STATE = 'trial' // trial | formal

function ok() {
  return { code: 0, msg: 'ok', data: null }
}

function buildData(type, p) {
  const now = formatNow()
  // 字段名以实际申请到的模板为准，以下为常见「一次性订阅」字段布局
  switch (type) {
    case 'new_order':
      return {
        thing1: { value: cut(p.dishName, 20) },
        thing2: { value: cut(`${p.buyerName || 'TA'} 想点这一单`, 20) },
        phrase1: { value: '待接单' },
        time3: { value: now }
      }
    case 'accepted':
      return {
        thing1: { value: cut(p.dishName, 20) },
        phrase1: { value: '已接单' },
        thing2: { value: cut(`${p.sellerName || '主厨'} 开始准备啦`, 20) },
        time3: { value: now }
      }
    case 'completed':
      return {
        thing1: { value: cut(p.dishName, 20) },
        phrase1: { value: '已完成' },
        thing2: { value: cut('心意值已入账', 20) },
        time3: { value: now }
      }
    case 'cancel':
      return {
        thing1: { value: cut(p.dishName, 20) },
        phrase1: { value: '已取消' },
        thing2: { value: cut('心意值已退还', 20) },
        time3: { value: now }
      }
    default:
      return null
  }
}

function cut(s, n) {
  s = String(s || '')
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatNow() {
  const d = new Date(Date.now() + 8 * 3600 * 1000)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

exports.main = async (event) => {
  try {
    if (event.action !== 'send') return ok()
    const { type, to, payload } = event
    const templateId = TEMPLATES[type]
    if (!templateId || !to) {
      console.log('[notify] 跳过推送：模板未配置或目标为空', type, to)
      return ok()
    }
    const data = buildData(type, payload || {})
    if (!data) return ok()
    await cloud.openapi.subscribeMessage.send({
      touser: to,
      templateId,
      page: 'pages/order/index',
      data,
      miniprogramState: MINIPROGRAM_STATE
    })
    return ok()
  } catch (e) {
    // 推送失败不抛错：常见于用户未订阅/模板字段不匹配，只记录日志
    console.warn('[notify] send fail', event.type, e && (e.errMsg || e.message))
    return ok()
  }
}
