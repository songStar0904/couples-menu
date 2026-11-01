const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const CATEGORIES_MAX = 20

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

// 校验并规整菜品数据
function sanitizeDish(dish) {
  const name = String((dish && dish.name) || '').trim().slice(0, 20)
  if (!name) throw new BizError(1007, '菜品名称不能为空')
  const type = dish.type === 'service' ? 'service' : 'dish'
  const category = String((dish && dish.category) || '').trim().slice(0, 10) || '其他'
  let price = Number(dish && dish.price)
  if (isNaN(price)) price = 0
  price = Math.max(0, Math.min(9999, Math.floor(price)))
  const desc = String((dish && dish.desc) || '').trim().slice(0, 100)
  const image = String((dish && dish.image) || '').slice(0, 300)
  const status = dish.status === 'off' ? 'off' : 'on'
  return { name, type, category, price, desc, image, status }
}

async function my(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const dishesRes = await db
    .collection('dishes')
    .where({ ownerId: openid })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  const soldRes = await db
    .collection('orders')
    .where({ sellerId: openid, status: 'completed' })
    .count()
  return ok({
    dishes: dishesRes.data || [],
    categories: me.categories || [],
    menuClosed: !!me.menuClosed,
    stats: { soldCount: soldRes.total || 0 }
  })
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

async function partner(openid) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const { partnerOpenid, partner } = await requireCouple(me)
  const dishesRes = await db
    .collection('dishes')
    .where({ ownerId: partnerOpenid, status: 'on' })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()
  return ok({
    dishes: dishesRes.data || [],
    categories: partner.categories || [],
    menuClosed: !!partner.menuClosed,
    partner: { nickname: partner.nickname || '', avatar: partner.avatar || '' }
  })
}

async function saveCategoryIfNeeded(me, category) {
  const categories = (me.categories || []).slice()
  if (categories.some((c) => c.name === category)) return
  categories.push({ name: category, sort: categories.length + 1 })
  if (categories.length > CATEGORIES_MAX) throw new BizError(1007, '分类太多啦')
  await db.collection('users').doc(me._id).update({ data: { categories } })
}

async function saveDish(openid, dishInput) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const dish = sanitizeDish(dishInput)
  const now = Date.now()
  if (dishInput._id) {
    const existed = (await db.collection('dishes').doc(dishInput._id).get().catch(() => ({ data: null }))).data
    if (!existed || existed.ownerId !== openid) throw new BizError(1006, '无权操作该菜品')
    await db.collection('dishes').doc(dishInput._id).update({
      data: { ...dish, updatedAt: now }
    })
    await saveCategoryIfNeeded(me, dish.category)
    return ok({ id: dishInput._id })
  }
  const res = await db.collection('dishes').add({
    data: {
      ownerId: openid,
      coupleId: me.coupleId || '',
      ...dish,
      soldCount: 0,
      createdAt: now,
      updatedAt: now
    }
  })
  await saveCategoryIfNeeded(me, dish.category)
  return ok({ id: res._id })
}

async function getOwnedDish(openid, id) {
  const dish = (await db.collection('dishes').doc(String(id || '')).get().catch(() => ({ data: null }))).data
  if (!dish || dish.ownerId !== openid) throw new BizError(1006, '无权操作该菜品')
  return dish
}

async function toggleDish(openid, id, status) {
  await getOwnedDish(openid, id)
  await db.collection('dishes').doc(id).update({ data: { status: status === 'on' ? 'on' : 'off', updatedAt: Date.now() } })
  return ok()
}

async function deleteDish(openid, id) {
  await getOwnedDish(openid, id)
  await db.collection('dishes').doc(id).remove()
  return ok()
}

async function setMenuClosed(openid, menuClosed) {
  await db.collection('users').doc(openid).update({ data: { menuClosed: !!menuClosed } })
  return ok()
}

async function renameCategory(openid, oldName, newName) {
  oldName = String(oldName || '').trim()
  newName = String(newName || '').trim().slice(0, 10)
  if (!oldName || !newName) throw new BizError(1007, '名称不能为空')
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const categories = (me.categories || []).map((c) => (c.name === oldName ? { ...c, name: newName } : c))
  await db.collection('users').doc(openid).update({ data: { categories } })
  await db.collection('dishes')
    .where({ ownerId: openid, category: oldName })
    .update({ data: { category: newName } })
    .catch(() => {})
  return ok()
}

async function deleteCategory(openid, name) {
  name = String(name || '').trim()
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const categories = (me.categories || []).filter((c) => c.name !== name)
  await db.collection('users').doc(openid).update({ data: { categories } })
  // 该分类下的菜品挪到「其他」
  await db.collection('dishes')
    .where({ ownerId: openid, category: name })
    .update({ data: { category: '其他' } })
    .catch(() => {})
  return ok()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'my':
        return await my(OPENID)
      case 'partner':
        return await partner(OPENID)
      case 'saveDish':
        return await saveDish(OPENID, event.dish || {})
      case 'toggleDish':
        return await toggleDish(OPENID, event.id, event.status)
      case 'deleteDish':
        return await deleteDish(OPENID, event.id)
      case 'setMenuClosed':
        return await setMenuClosed(OPENID, event.menuClosed)
      case 'renameCategory':
        return await renameCategory(OPENID, event.oldName, event.newName)
      case 'deleteCategory':
        return await deleteCategory(OPENID, event.name)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[menu]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
