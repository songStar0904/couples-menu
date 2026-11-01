const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 全部数据集合
const COLLECTIONS = [
  'users',
  'couples',
  'invites',
  'dishes',
  'orders',
  'point_records',
  'sign_records',
  'templates',
  'submissions',
  'dynamics'
]

// 精选模板种子数据（发现页）
const TEMPLATES_SEED = [
  {
    title: '一人食补偿菜单',
    subtitle: '当 TA 不能陪你吃饭时，用这些心意补偿一下',
    emoji: '🍱',
    colors: ['#FF8FA9', '#FBC2D4'],
    tags: ['补偿', '日常'],
    sort: 1,
    status: 'published',
    useCount: 0,
    items: [
      { name: '明天早餐我做', type: 'service', category: '心意服务', price: 20, desc: '第二天早上吃上热乎的' },
      { name: '拥抱十分钟', type: 'service', category: '心意服务', price: 10, desc: '什么都不干，就抱一会儿' },
      { name: '按肩膀五分钟', type: 'service', category: '心意服务', price: 15, desc: '加班后的专属按摩' },
      { name: '奶茶投喂', type: 'dish', category: '甜品饮品', price: 18, desc: '全糖去冰我说了算' },
      { name: '今天听我的', type: 'service', category: '心意服务', price: 30, desc: '一票否决权用一次' }
    ]
  },
  {
    title: '周末早餐计划',
    subtitle: '把睡到自然醒的早晨变成小馆营业时间',
    emoji: '🌅',
    colors: ['#FFC46B', '#FFE3B3'],
    tags: ['早餐', '周末'],
    sort: 2,
    status: 'published',
    useCount: 0,
    items: [
      { name: '元气三明治', type: 'dish', category: '拿手菜', price: 15, desc: '加蛋加芝士，番茄不要钱' },
      { name: '现磨豆浆', type: 'dish', category: '甜品饮品', price: 5, desc: '甜度可选' },
      { name: '太阳蛋吐司', type: 'dish', category: '拿手菜', price: 12, desc: '溏心程度随缘' },
      { name: '床上早餐服务', type: 'service', category: '心意服务', price: 25, desc: '端到床边，含一句早安' },
      { name: '水果拼盘', type: 'dish', category: '甜品饮品', price: 10, desc: '当季水果切块' }
    ]
  },
  {
    title: '深夜食堂',
    subtitle: '加班晚归的日子，小馆为你留一盏灯',
    emoji: '🌙',
    colors: ['#6E7FF3', '#A5B8FB'],
    tags: ['夜宵', '加班'],
    sort: 3,
    status: 'published',
    useCount: 0,
    items: [
      { name: '灵魂炒饭', type: 'dish', category: '拿手菜', price: 20, desc: '加班后的第一口热饭' },
      { name: '酸汤面', type: 'dish', category: '拿手菜', price: 15, desc: '酸辣开胃，十分钟出锅' },
      { name: '热牛奶', type: 'dish', category: '甜品饮品', price: 5, desc: '助眠特调' },
      { name: '无声陪伴', type: 'service', category: '心意服务', price: 10, desc: '你忙你的，我在旁边' },
      { name: '接送回家', type: 'service', category: '心意服务', price: 25, desc: '加班再晚也来接你' }
    ]
  },
  {
    title: '雨天限定·宅家套餐',
    subtitle: '下雨天和小馆更配哦',
    emoji: '🌧️',
    colors: ['#7CB8FC', '#B3D4FD'],
    tags: ['宅家', '雨天'],
    sort: 4,
    status: 'published',
    useCount: 0,
    items: [
      { name: '番茄浓汤面', type: 'dish', category: '拿手菜', price: 18, desc: '一碗下肚浑身暖暖的' },
      { name: '可乐鸡翅', type: 'dish', category: '拿手菜', price: 25, desc: '甜蜜暴击' },
      { name: '电影之夜', type: 'service', category: '心意服务', price: 30, desc: '爆米花由主厨负责' },
      { name: '一起睡午觉', type: 'service', category: '心意服务', price: 20, desc: '听着雨声补一觉' },
      { name: '热可可', type: 'dish', category: '甜品饮品', price: 8, desc: '加棉花糖' }
    ]
  },
  {
    title: '心意服务·九连击',
    subtitle: '纯心意服务的菜单，把说不出口的都做成菜',
    emoji: '💝',
    colors: ['#FA6E93', '#FCC2DE'],
    tags: ['心意', '服务'],
    sort: 5,
    status: 'published',
    useCount: 0,
    items: [
      { name: '一个拥抱', type: 'service', category: '心意服务', price: 5, desc: '随时可点，无限续杯' },
      { name: '夸夸套餐', type: 'service', category: '心意服务', price: 10, desc: '彩虹屁三连发' },
      { name: '捶背五分钟', type: 'service', category: '心意服务', price: 10, desc: '力度可调' },
      { name: '今天你说了算', type: 'service', category: '心意服务', price: 35, desc: '干什么吃什么全听你的' },
      { name: '手写小纸条', type: 'service', category: '心意服务', price: 15, desc: '藏在你能看到的地方' },
      { name: '陪逛街拎包', type: 'service', category: '心意服务', price: 20, desc: '全程不喊累' }
    ]
  },
  {
    title: '今日份甜蜜挑战',
    subtitle: '有点好玩有点撒娇的挑战型菜单',
    emoji: '🎯',
    colors: ['#8BC6EC', '#F9C8D9'],
    tags: ['挑战', '互动'],
    sort: 6,
    status: 'published',
    useCount: 0,
    items: [
      { name: '对视一分钟', type: 'service', category: '心意服务', price: 15, desc: '先笑的人洗一周的碗' },
      { name: '模仿对方一次', type: 'service', category: '心意服务', price: 10, desc: '要模仿到点子上' },
      { name: '突然表白一次', type: 'service', category: '心意服务', price: 20, desc: '要当面说，不许发微信' },
      { name: '一起跳一支舞', type: 'service', category: '心意服务', price: 25, desc: '随便什么歌' },
      { name: '三星厨神挑战', type: 'dish', category: '拿手菜', price: 50, desc: '本周最用心的一道菜' }
    ]
  }
]

function ok(data) {
  return { code: 0, msg: 'ok', data }
}

exports.main = async (event) => {
  try {
    const action = event.action || 'setup'

    if (action === 'check') {
      const result = {}
      for (const name of COLLECTIONS) {
        try {
          await db.collection(name).count()
          result[name] = 'ok'
        } catch (e) {
          result[name] = 'missing'
        }
      }
      return ok(result)
    }

    // setup：建集合 + 种子数据（幂等）
    const created = []
    for (const name of COLLECTIONS) {
      try {
        await db.createCollection(name)
        created.push(name)
      } catch (e) { /* 已存在 */ }
    }

    const existed = await db.collection('templates').count()
    let seeded = 0
    if ((existed.total || 0) === 0) {
      for (const tpl of TEMPLATES_SEED) {
        await db.collection('templates').add({ data: tpl })
        seeded++
      }
    }

    return ok({ createdCollections: created, seededTemplates: seeded, message: '初始化完成。建议到控制台把所有集合权限设为「仅创建者可读写」' })
  } catch (e) {
    console.error('[init]', e)
    return { code: 1, msg: '初始化失败：' + (e.message || '未知错误') }
  }
}
