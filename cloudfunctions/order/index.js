const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const PAGE_SIZE = 10

class BizError extends Error {
  constructor(code, msg) {
    super(msg)
    this.code = code
  }
}

function ok(data) {
  return { code: 0, msg: 'ok', data }
}

async function getUser(openid) {
  try {
    const r = await db.collection('users').doc(openid).get()
    return r.data
  } catch (e) {
    return null
  }
}

async function getOrder(id) {
  return (await db.collection('orders').doc(String(id || '')).get().catch(() => ({ data: null }))).data
}

async function requireCouple(me) {
  if (!me.coupleId) throw new BizError(1001, '你还没有绑定伴侣')
  const couple = (await db.collection('couples').doc(me.coupleId).get().catch(() => ({ data: null }))).data
  if (!couple || couple.status !== 'active') throw new BizError(1001, '伴侣关系已解除')
  const partnerOpenid = (couple.members || []).find((m) => m !== me._id)
  if (!partnerOpenid) throw new BizError(1001, '伴侣关系异常')
  const partner = await getUser(partnerOpenid)
  if (!partner) throw new BizError(1001, '伴侣不存在')
  return { couple, partnerOpenid, partner }
}

async function addDynamic(coupleId, actor, type, text, refId) {
  await db.collection('dynamics')
    .add({
      data: {
        coupleId,
        actorId: actor._id,
        actorName: actor.nickname || '小可爱',
        type,
        text,
        refId: refId || '',
        createdAt: Date.now()
      }
    })
    .catch(() => {})
}

// 通知（fire-and-forget，不阻塞主流程）
function notify(type, to, payload) {
  cloud
    .callFunction({ name: 'notify', data: { action: 'send', type, to, payload } })
    .catch((e) => console.warn('[order] notify fail', type, e && e.message))
}

// 记账 + 改余额（事务内调用）
async function txChangePoints(tx, openid, delta, type, title, refId) {
  const doc = (await tx.collection('users').doc(openid).get()).data
  const before = (doc && doc.points) || 0
  await tx.collection('users').doc(openid).update({ data: { points: _.inc(delta) } })
  await tx.collection('point_records').add({
    data: { openid, delta, balance: before + delta, type, title, refId: refId || '', createdAt: Date.now() }
  })
  return before + delta
}

/* ===== 下单（事务扣心意值）===== */
async function create(openid, event) {
  const dishId = String(event.dishId || '')
  if (!dishId) throw new BizError(1007, '缺少菜品')
  const note = String(event.note || '').trim().slice(0, 50)
  const wishDate = /^\d{4}-\d{2}-\d{2}$/.test(String(event.wishDate || '')) ? event.wishDate : ''

  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const { couple, partnerOpenid, partner } = await requireCouple(me)

  const dish = (await db.collection('dishes').doc(dishId).get().catch(() => ({ data: null }))).data
  if (!dish || dish.ownerId !== partnerOpenid) throw new BizError(1007, '只能点 TA 菜单里的菜品')
  if (dish.status !== 'on') throw new BizError(1007, '这道菜已下架')
  if (partner.menuClosed) throw new BizError(1007, 'TA 今天休息 😴 暂不接单')

  const price = dish.price || 0
  const now = Date.now()
  const orderData = {
    buyerId: openid,
    buyerName: me.nickname || '小可爱',
    buyerAvatar: me.avatar || '',
    sellerId: partnerOpenid,
    sellerName: partner.nickname || '主厨',
    sellerAvatar: partner.avatar || '',
    dishId,
    dishName: dish.name,
    dishImage: dish.image || '',
    dishType: dish.type,
    price,
    note,
    wishDate,
    status: 'pending',
    cancelBy: '',
    review: null,
    createdAt: now,
    acceptedAt: 0,
    completedAt: 0,
    updatedAt: now
  }

  const t = await db.startTransaction()
  let orderId
  try {
    if (price > 0) {
      const buyerDoc = (await t.collection('users').doc(openid).get()).data
      if (!buyerDoc || (buyerDoc.points || 0) < price) {
        throw new BizError(1003, '心意值不够啦，去签到赚一点 ❤')
      }
    }
    const addRes = await t.collection('orders').add({ data: orderData })
    orderId = addRes._id
    if (price > 0) {
      await txChangePoints(t, openid, -price, 'order_pay', `点单「${dish.name}」`, orderId)
    }
    await t.commit()
  } catch (e) {
    try { await t.rollback() } catch (e2) { /* 忽略 */ }
    if (e.code) throw e
    console.error('[order.create] tx', e)
    throw new BizError(1, '下单失败，请稍后再试')
  }

  await db.collection('dishes').doc(dishId).update({ data: { soldCount: _.inc(1) } }).catch(() => {})
  await addDynamic(couple._id, me, 'order_create', `点了「${dish.name}」`, orderId)
  notify('new_order', partnerOpenid, { dishName: dish.name, buyerName: orderData.buyerName, price })
  return ok({ id: orderId })
}

/* ===== 主厨：接单 ===== */
async function accept(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  if (order.sellerId !== openid) throw new BizError(1006, '无权操作该订单')
  if (order.status !== 'pending') throw new BizError(1005, '当前状态无法接单')
  const now = Date.now()
  await db.collection('orders').doc(id).update({ data: { status: 'accepted', acceptedAt: now, updatedAt: now } })
  const me = await getUser(openid)
  await addDynamic(order.coupleId || '', me || { _id: openid }, 'order_accept', `接下了「${order.dishName}」`, id)
  notify('accepted', order.buyerId, { dishName: order.dishName, sellerName: (me && me.nickname) || '主厨' })
  return ok()
}

/* ===== 主厨：完成（心意值转入）===== */
async function complete(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  if (order.sellerId !== openid) throw new BizError(1006, '无权操作该订单')
  if (order.status !== 'accepted') throw new BizError(1005, '当前状态无法完成')
  if (!order.price) {
    // 0 心意值订单直接完成
    const now = Date.now()
    await db.collection('orders').doc(id).update({ data: { status: 'completed', completedAt: now, updatedAt: now } })
    await afterComplete(openid, order, id)
    return ok()
  }
  const t = await db.startTransaction()
  try {
    const now = Date.now()
    await t.collection('orders').doc(id).update({ data: { status: 'completed', completedAt: now, updatedAt: now } })
    await txChangePoints(t, openid, order.price, 'order_earn', `完成「${order.dishName}」`, id)
    await t.commit()
  } catch (e) {
    try { await t.rollback() } catch (e2) { /* 忽略 */ }
    console.error('[order.complete] tx', e)
    throw new BizError(1, '操作失败，请稍后再试')
  }
  await afterComplete(openid, order, id)
  return ok()
}

async function afterComplete(openid, order, id) {
  const me = await getUser(openid)
  await addDynamic(order.coupleId || '', me || { _id: openid }, 'order_complete', `完成了「${order.dishName}」🎉`, id)
  notify('completed', order.buyerId, { dishName: order.dishName, sellerName: (me && me.nickname) || '主厨' })
}

/* ===== 取消与退款 ===== */
async function doCancel(order, by, operator) {
  const t = await db.startTransaction()
  try {
    const now = Date.now()
    await t.collection('orders').doc(order._id).update({
      data: { status: 'cancelled', cancelBy: by, updatedAt: now }
    })
    if (order.price > 0) {
      await txChangePoints(t, order.buyerId, order.price, 'refund', `「${order.dishName}」订单退款`, order._id)
    }
    await t.commit()
  } catch (e) {
    try { await t.rollback() } catch (e2) { /* 忽略 */ }
    console.error('[order.cancel] tx', e)
    throw new BizError(1, '操作失败，请稍后再试')
  }
  const me = await getUser(operator)
  const text = by === 'buyer' ? `取消了「${order.dishName}」的订单` : `拒绝了「${order.dishName}」的订单`
  await addDynamic(order.coupleId || '', me || { _id: operator }, 'order_create', text, order._id)
  const to = by === 'buyer' ? order.sellerId : order.buyerId
  notify('cancel', to, { dishName: order.dishName })
}

async function cancel(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  const isBuyer = order.buyerId === openid
  const isSeller = order.sellerId === openid
  if (!isBuyer && !isSeller) throw new BizError(1006, '无权操作该订单')

  if (isBuyer) {
    if (order.status === 'pending') return doCancel(order, 'buyer', openid)
    if (order.status === 'accepted') {
      await db.collection('orders').doc(id).update({
        data: { status: 'cancel_requested', cancelBy: 'buyer', updatedAt: Date.now() }
      })
      notify('cancel', order.sellerId, { dishName: order.dishName })
      return ok()
    }
    throw new BizError(1005, '当前状态无法取消')
  }
  // 主厨：待接单拒绝 或 已接单取消，均直接退款
  if (order.status === 'pending' || order.status === 'accepted') {
    return doCancel(order, 'seller', openid)
  }
  throw new BizError(1005, '当前状态无法取消')
}

async function confirmCancel(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  if (order.sellerId !== openid) throw new BizError(1006, '无权操作该订单')
  if (order.status !== 'cancel_requested') throw new BizError(1005, '当前没有取消申请')
  return doCancel(order, 'buyer', openid)
}

async function declineCancel(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  if (order.sellerId !== openid) throw new BizError(1006, '无权操作该订单')
  if (order.status !== 'cancel_requested') throw new BizError(1005, '当前没有取消申请')
  await db.collection('orders').doc(id).update({
    data: { status: 'accepted', cancelBy: '', updatedAt: Date.now() }
  })
  notify('accepted', order.buyerId, { dishName: order.dishName })
  return ok()
}

/* ===== 查询 ===== */
async function list(openid, event) {
  const tab = event.tab === 'received' ? 'received' : 'bought'
  const where =
    tab === 'bought'
      ? { buyerId: openid }
      : { sellerId: openid }
  let query = db.collection('orders').where(where)
  if (event.cursor) {
    query = db.collection('orders').where({ ...where, createdAt: _.lt(Number(event.cursor)) })
  }
  const res = await query.orderBy('createdAt', 'desc').limit(PAGE_SIZE).get()
  const list = res.data || []
  const finished = list.length < PAGE_SIZE
  return ok({
    list,
    nextCursor: finished ? null : list.length ? list[list.length - 1].createdAt : null,
    finished
  })
}

async function detail(openid, id) {
  const order = await getOrder(id)
  if (!order) throw new BizError(1007, '订单不存在')
  let role = null
  if (order.buyerId === openid) role = 'buyer'
  if (order.sellerId === openid) role = 'seller'
  if (!role) throw new BizError(1006, '无权查看该订单')
  return ok({ order, role })
}

async function review(openid, event) {
  const order = await getOrder(event.id)
  if (!order) throw new BizError(1007, '订单不存在')
  if (order.buyerId !== openid) throw new BizError(1006, '只有点单人可以评价')
  if (order.status !== 'completed') throw new BizError(1005, '订单完成后才能评价')
  if (order.review && order.review.rating) throw new BizError(1005, '已经评价过啦')
  let rating = Number(event.rating)
  if (!(rating >= 1 && rating <= 5)) throw new BizError(1007, '评分不合法')
  rating = Math.floor(rating)
  const message = String(event.message || '').trim().slice(0, 60)
  const review = { rating, message, createdAt: Date.now() }
  await db.collection('orders').doc(order._id).update({ data: { review, updatedAt: Date.now() } })
  const me = await getUser(openid)
  await addDynamic(order.coupleId || '', me || { _id: openid }, 'review', `评价了「${order.dishName}」：${'❤'.repeat(rating)}`, order._id)
  notify('completed', order.sellerId, { dishName: order.dishName })
  return ok()
}

async function summary(openid) {
  const [pendingRes, activeRes] = await Promise.all([
    db.collection('orders').where({ sellerId: openid, status: 'pending' }).count(),
    db
      .collection('orders')
      .where({ buyerId: openid, status: _.in(['accepted', 'cancel_requested']) })
      .count()
  ])
  return ok({ sellerPending: pendingRes.total || 0, myActive: activeRes.total || 0 })
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'create':
        return await create(OPENID, event)
      case 'accept':
        return await accept(OPENID, event.id)
      case 'complete':
        return await complete(OPENID, event.id)
      case 'cancel':
        return await cancel(OPENID, event.id)
      case 'confirmCancel':
        return await confirmCancel(OPENID, event.id)
      case 'declineCancel':
        return await declineCancel(OPENID, event.id)
      case 'list':
        return await list(OPENID, event)
      case 'detail':
        return await detail(OPENID, event.id)
      case 'review':
        return await review(OPENID, event)
      case 'summary':
        return await summary(OPENID)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[order]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
