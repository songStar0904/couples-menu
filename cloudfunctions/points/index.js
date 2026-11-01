const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SIGN_BASE = 5
const SIGN_STREAK_BONUS = 10
const STREAK_CYCLE = 7
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

function todayStr(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000 + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

async function getUser(openid) {
  try {
    const r = await db.collection('users').doc(openid).get()
    return r.data
  } catch (e) {
    return null
  }
}

async function overview(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const today = todayStr()
  const monthPrefix = today.slice(0, 7)

  const [todayRes, monthRes, signDatesRes, lastRes, firstOrderRes] = await Promise.all([
    db.collection('sign_records').where({ openid, date: today }).count(),
    db.collection('sign_records').where({ openid, date: _.gte(monthPrefix + '-01').and(_.lte(monthPrefix + '-31')) }).count(),
    db.collection('sign_records').where({ openid, date: _.gte(monthPrefix + '-01').and(_.lte(monthPrefix + '-31')) }).limit(31).get(),
    db.collection('sign_records').where({ openid }).orderBy('date', 'desc').limit(1).get(),
    db.collection('orders').where({ sellerId: openid, status: 'completed' }).count()
  ])

  // 连续天数：以最近一次签到记录的 streak 为准（中断后签到时会重算）
  const last = (lastRes.data || [])[0]
  const yesterday = todayStr(-1)
  const streak = last && (last.date === today || last.date === yesterday) ? last.streak || 1 : 0

  const tasks = [
    { key: 'sign', title: '每日签到', reward: SIGN_BASE, desc: '连续签到满 7 天额外 +10', done: (todayRes.total || 0) > 0 },
    { key: 'bind', title: '绑定伴侣', reward: 66, desc: '建立你们的专属小馆，双方各 +66', done: !!me.coupleId },
    {
      key: 'first_complete',
      title: '完成一次订单',
      reward: 0,
      desc: '接单并完成，心意值直接入账',
      done: (firstOrderRes.total || 0) > 0
    }
  ]

  return ok({
    balance: me.points || 0,
    todaySigned: (todayRes.total || 0) > 0,
    streak,
    monthCount: monthRes.total || 0,
    signDates: (signDatesRes.data || []).map((r) => r.date),
    tasks,
    today
  })
}

async function sign(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const today = todayStr()
  const yesterday = todayStr(-1)

  const lastRes = await db.collection('sign_records').where({ openid }).orderBy('date', 'desc').limit(1).get()
  const last = (lastRes.data || [])[0]
  if (last && last.date === today) throw new BizError(1005, '今天已经签到过啦')

  const streak = last && last.date === yesterday ? (last.streak || 1) + 1 : 1
  const reward = SIGN_BASE + (streak % STREAK_CYCLE === 0 ? SIGN_STREAK_BONUS : 0)

  const t = await db.startTransaction()
  let balance
  try {
    balance = await changePoints(t, openid, reward, 'sign', `每日签到（连续 ${streak} 天）`, '')
    await t.collection('sign_records').add({
      data: { _id: `${openid}_${today}`, openid, date: today, streak, reward, createdAt: Date.now() }
    })
    await t.commit()
  } catch (e) {
    try { await t.rollback() } catch (e2) { /* 忽略 */ }
    if (e.code) throw e
    // _id 冲突 = 并发重复签到
    if (String(e.errCode) === '-502001' || (e.message || '').indexOf('duplicate') >= 0) {
      throw new BizError(1005, '今天已经签到过啦')
    }
    console.error('[points.sign] tx', e)
    throw new BizError(1, '签到失败，请稍后再试')
  }
  return ok({ reward, streak, balance })
}

async function changePoints(tx, openid, delta, type, title, refId) {
  const doc = (await tx.collection('users').doc(openid).get()).data
  const before = (doc && doc.points) || 0
  await tx.collection('users').doc(openid).update({ data: { points: _.inc(delta) } })
  await tx.collection('point_records').add({
    data: { openid, delta, balance: before + delta, type, title, refId: refId || '', createdAt: Date.now() }
  })
  return before + delta
}

async function ledger(openid, event) {
  let query = db.collection('point_records').where({ openid })
  if (event.cursor) {
    query = db.collection('point_records').where({ openid, createdAt: _.lt(Number(event.cursor)) })
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

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'overview':
        return await overview(OPENID)
      case 'sign':
        return await sign(OPENID)
      case 'ledger':
        return await ledger(OPENID, event)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[points]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
