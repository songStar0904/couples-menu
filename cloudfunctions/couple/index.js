const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const INVITE_TTL_MIN = 10
const BIND_REWARD = 66
const CODE_ALPHABET = 'ACDEFHJKLMNPRTUVWXY345679' // 去掉易混淆字符

class BizError extends Error {
  constructor(code, msg) {
    super(msg)
    this.code = code
  }
}

function ok(data) {
  return { code: 0, msg: 'ok', data }
}

function todayStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

async function getUser(openid) {
  try {
    const r = await db.collection('users').doc(openid).get()
    return r.data
  } catch (e) {
    return null
  }
}

function makeCode() {
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return s
}

async function createInvite(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  if (me.coupleId) {
    const c = (await db.collection('couples').doc(me.coupleId).get().catch(() => ({ data: null }))).data
    if (c && c.status === 'active') throw new BizError(1002, '你已经绑定伴侣啦')
  }
  // 清掉自己的旧口令
  await db.collection('invites').where({ openid }).remove().catch(() => {})
  // 生成不冲突的新口令
  let code = null
  for (let i = 0; i < 5; i++) {
    const candidate = makeCode()
    try {
      await db.collection('invites').add({
        data: {
          _id: candidate,
          openid,
          nickname: me.nickname || '小可爱',
          avatar: me.avatar || '',
          expireAt: Date.now() + INVITE_TTL_MIN * 60 * 1000
        }
      })
      code = candidate
      break
    } catch (e) { /* 口令撞车，重试 */ }
  }
  if (!code) throw new BizError(1, '口令生成失败，请重试')
  return ok({ code, expireInMin: INVITE_TTL_MIN })
}

async function bindByCode(openid, code) {
  code = String(code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{6}$/.test(code)) throw new BizError(1004, '请输入 6 位口令')

  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  if (me.coupleId) throw new BizError(1002, '你已经绑定伴侣啦')

  const invite = (await db.collection('invites').doc(code).get().catch(() => ({ data: null }))).data
  if (!invite || (invite.expireAt && invite.expireAt < Date.now())) {
    throw new BizError(1004, '口令无效或已过期，让 TA 重新生成吧')
  }
  if (invite.openid === openid) throw new BizError(1004, '不能和自己绑定哦')

  const inviter = await getUser(invite.openid)
  if (!inviter) throw new BizError(1004, '邀请人不存在')
  if (inviter.coupleId) throw new BizError(1002, '对方已经绑定别人啦')

  const now = Date.now()
  const coupleRes = await db.collection('couples').add({
    data: {
      members: [invite.openid, openid],
      togetherDate: todayStr(),
      status: 'active',
      createdAt: now
    }
  })
  const coupleId = coupleRes._id

  await db.collection('users').doc(invite.openid).update({ data: { coupleId } })
  await db.collection('users').doc(openid).update({ data: { coupleId } })

  // 双方绑定奖励
  for (const uid of [invite.openid, openid]) {
    const u = await getUser(uid)
    const before = (u && u.points) || 0
    await db.collection('users').doc(uid).update({ data: { points: _.inc(BIND_REWARD) } })
    await db.collection('point_records').add({
      data: {
        openid: uid,
        delta: BIND_REWARD,
        balance: before + BIND_REWARD,
        type: 'bind',
        title: '绑定奖励',
        refId: coupleId,
        createdAt: now
      }
    })
  }

  await db.collection('invites').doc(code).remove().catch(() => {})
  await db.collection('dynamics').add({
    data: {
      coupleId,
      actorId: openid,
      actorName: me.nickname || '小可爱',
      type: 'bind',
      text: '我们建立了专属小馆 💞',
      refId: coupleId,
      createdAt: now
    }
  })

  return ok({ couple: { _id: coupleId, members: [invite.openid, openid], togetherDate: todayStr() } })
}

async function unbind(openid) {
  const me = await getUser(openid)
  if (!me || !me.coupleId) throw new BizError(1007, '你还没有绑定伴侣')
  const couple = (await db.collection('couples').doc(me.coupleId).get().catch(() => ({ data: null }))).data
  if (!couple) throw new BizError(1007, '关系不存在')
  await db.collection('couples').doc(couple._id).update({
    data: { status: 'dissolved', dissolvedAt: Date.now() }
  })
  for (const uid of couple.members || []) {
    await db.collection('users').doc(uid).update({ data: { coupleId: '' } }).catch(() => {})
  }
  return ok()
}

async function info(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  let couple = null
  let partner = null
  if (me.coupleId) {
    couple = (await db.collection('couples').doc(me.coupleId).get().catch(() => ({ data: null }))).data
    if (couple && couple.status === 'active') {
      const partnerOpenid = (couple.members || []).find((m) => m !== openid)
      if (partnerOpenid) {
        const p = await getUser(partnerOpenid)
        partner = p ? { nickname: p.nickname || '', avatar: p.avatar || '', motto: p.motto || '' } : null
      }
    } else {
      couple = null
    }
  }
  return ok({ couple, partner })
}

async function updateTogetherDate(openid, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) throw new BizError(1007, '日期格式不正确')
  const me = await getUser(openid)
  if (!me || !me.coupleId) throw new BizError(1001, '你还没有绑定伴侣')
  await db.collection('couples').doc(me.coupleId).update({ data: { togetherDate: date } })
  return ok()
}

async function dynamics(openid) {
  const me = await getUser(openid)
  if (!me || !me.coupleId) return ok([])
  const r = await db
    .collection('dynamics')
    .where({ coupleId: me.coupleId })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
  return ok(r.data || [])
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'createInvite':
        return await createInvite(OPENID)
      case 'bindByCode':
        return await bindByCode(OPENID, event.code)
      case 'unbind':
        return await unbind(OPENID)
      case 'info':
        return await info(OPENID)
      case 'updateTogetherDate':
        return await updateTogetherDate(OPENID, event.date)
      case 'dynamics':
        return await dynamics(OPENID)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[couple]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
