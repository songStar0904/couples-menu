const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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

async function listTemplates() {
  const res = await db
    .collection('templates')
    .where({ status: 'published' })
    .orderBy('sort', 'asc')
    .limit(50)
    .get()
  return ok(res.data || [])
}

async function templateDetail(id) {
  const tpl = (await db.collection('templates').doc(String(id || '')).get().catch(() => ({ data: null }))).data
  if (!tpl) throw new BizError(1007, '模板不存在')
  return ok(tpl)
}

// 一键导入：同名同类型去重，缺失分类自动创建
async function importTemplate(openid, id) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const tpl = (await db.collection('templates').doc(String(id || '')).get().catch(() => ({ data: null }))).data
  if (!tpl) throw new BizError(1007, '模板不存在')

  const myDishes = await db.collection('dishes').where({ ownerId: openid }).limit(200).get()
  const existedKeys = new Set(
    (myDishes.data || []).map((d) => `${d.type}|${d.name}`)
  )
  const categories = (me.categories || []).slice()
  const now = Date.now()
  let imported = 0
  let skipped = 0

  for (const item of tpl.items || []) {
    const type = item.type === 'service' ? 'service' : 'dish'
    const name = String(item.name || '').trim().slice(0, 20)
    if (!name) continue
    const category = String(item.category || '').trim().slice(0, 10) || '其他'
    let price = Number(item.price)
    if (isNaN(price)) price = 0
    price = Math.max(0, Math.min(9999, Math.floor(price)))
    const desc = String(item.desc || '').trim().slice(0, 100)

    const key = `${type}|${name}`
    if (existedKeys.has(key)) {
      skipped++
      continue
    }
    if (!categories.some((c) => c.name === category)) {
      categories.push({ name: category, sort: categories.length + 1 })
    }
    await db.collection('dishes').add({
      data: {
        ownerId: openid,
        coupleId: me.coupleId || '',
        name,
        type,
        category,
        price,
        desc,
        image: '',
        status: 'on',
        soldCount: 0,
        createdAt: now,
        updatedAt: now
      }
    })
    existedKeys.add(key)
    imported++
  }

  if (categories.length !== (me.categories || []).length) {
    await db.collection('users').doc(openid).update({ data: { categories } })
  }
  await db.collection('templates').doc(tpl._id).update({ data: { useCount: _.inc(1) } }).catch(() => {})
  return ok({ imported, skipped })
}

async function submitTemplate(openid, event) {
  const me = await getUser(openid)
  if (!me) throw new BizError(1007, '用户不存在')
  const title = String(event.title || '').trim().slice(0, 20)
  const desc = String(event.desc || '').trim().slice(0, 80)
  const itemsInput = Array.isArray(event.items) ? event.items : []
  if (!title) throw new BizError(1007, '模板名称不能为空')
  if (!itemsInput.length) throw new BizError(1007, '至少选择一道菜品')
  if (itemsInput.length > 20) throw new BizError(1007, '最多选择 20 道菜品')

  const items = itemsInput.map((it) => {
    let price = Number(it.price)
    if (isNaN(price)) price = 0
    return {
      name: String(it.name || '').trim().slice(0, 20),
      type: it.type === 'service' ? 'service' : 'dish',
      category: String(it.category || '').trim().slice(0, 10) || '其他',
      price: Math.max(0, Math.min(9999, Math.floor(price))),
      desc: String(it.desc || '').trim().slice(0, 100)
    }
  })

  await db.collection('submissions').add({
    data: {
      openid,
      nickname: me.nickname || '小可爱',
      title,
      desc,
      items,
      status: 'pending',
      createdAt: Date.now()
    }
  })
  return ok()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'listTemplates':
        return await listTemplates()
      case 'templateDetail':
        return await templateDetail(event.id)
      case 'importTemplate':
        return await importTemplate(OPENID, event.id)
      case 'submitTemplate':
        return await submitTemplate(OPENID, event)
      default:
        return { code: 1007, msg: '未知操作' }
    }
  } catch (e) {
    if (e.code) return { code: e.code, msg: e.message }
    console.error('[discover]', event.action, e)
    return { code: 1, msg: '服务开小差了，请稍后再试' }
  }
}
