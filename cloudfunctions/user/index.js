const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DEFAULT_CATEGORIES = [
  { name: '拿手菜', sort: 1 },
  { name: '心意服务', sort: 2 },
  { name: '甜品饮品', sort: 3 },
  { name: '其他', sort: 4 }
]
const WELCOME_POINTS = 200

class BizError extends Error {
  constructor(code, msg) {
    super(msg)
    this.code = code
  }
}

function ok(data) {
  return { code: 0, msg: 'ok', data }
}

function pickUser(u) {
  return {
    _id: u._id,
    nickname: u.nickname || '',
    avatar: u.avatar || '',
    motto: u.motto || '',
    coupleId: u.coupleId || '',
    points: u.points || 0,
    categories: u.categories || [],
    menuClosed: !!u.menuClosed,
    settings: u.settings || {}
  }
}

async function getUser(openid) {
  try {
    const r = await db.collection('users').doc(openid).get()
    return r.data
  } catch (e) {
    return null
  }
}

async function loadRelation(openid, user) {
  let couple = null
  let partner = null
  if (user.coupleId) {
    couple = (await db.collection('couples').doc(user.coupleId).get().catch(() => ({ data: null }))).data
    if (couple && couple.status === 'active') {
      const partnerOpenid = (couple.members || []).find((m) => m !== openid)
      if (partnerOpenid) {
        const p = await getUser(partnerOpenid)
        partner = p ? { nickname: p.nickname || '', avatar: p.avatar || '', motto: p.motto || '' } : null
      }
    } else {
      // 关系已解除：清理孤儿引用
      couple = null
      await db.collection('users').doc(openid).update({ data: { coupleId: '' } })
      user.coupleId = ''
    }
  }
  return { couple, partner }
}

async function login(openid) {
  let user = await getUser(openid)
  const now = Date.now()
  if (!user) {
    user = {
      _id: openid,
      nickname: '',
      avatar: '',
      motto: '',
      coupleId: '',
      points: 0,
      categories: DEFAULT_CATEGORIES,
      menuClosed: false,
      settings: { theme: 'pink', notifyOrder: true, notifyAccept: true },
      createdAt: now,
      lastLoginAt: now
    }
    await db.collection('users').add({ data: user })
    // 注册礼包
    await db.collection('users').doc(openid).update({ data: { points: _.inc(WELCOME_POINTS) } })
    await db.collection('point_records').add({
      data: {
        openid,
        delta: WELCOME_POINTS,
        balance: WELCOME_POINTS,
        type: 'register',
        title: '注册礼包',
        refId: '',
        createdAt: now
      }
    })
    user.points = WELCOME_POINTS
  } else {
    await db.collection('users').doc(openid).update({ data: { lastLoginAt: now } })
  }
  const { couple, partner } = await loadRelation(openid, user)
  return ok({ user: pickUser(user), couple, partner })
}

async function updateProfile(openid, event) {
  const data = {}
  if (event.nickname !== undefined) {
    const nickname = String(event.nickname).trim().slice(0, 12)
    if (!nickname) throw new BizError(1007, '昵称不能为空')
    data.nickname = nickname
  }
  if (event.avatar !== undefined) data.avatar = String(event.avatar).slice(0, 200)
  if (event.motto !== undefined) data.motto = String(event.motto).trim().slice(0, 30)
  await db.collection('users').doc(openid).update({ data })
  const user = await getUser(openid)
  return ok({ user: pickUser(user) })
}

async function updateSettings(openid, event) {
  const patch = {}
  if (event.theme !== undefined) patch['settings.theme'] = event.theme === 'blue' ? 'blue' : 'pink'
  if (event.notifyOrder !== undefined) patch['settings.notifyOrder'] = !!event.notifyOrder
  if (event.notifyAccept !== undefined) patch['settings.notifyAccept'] = !!event.notifyAccept
  if (Object.keys(patch).length) {
    await db.collection('users').doc(openid).update({ data: patch })
  }
  const user = await getUser(openid)
  return ok({ user: pickUser(user) })
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'login':
        return await login(OPENID)
      case 'updateProfile':
        return await updateProfile(OPENID, event)
      case 'updateSettings':
        return await updateSettings(OPENID, event)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[user]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
