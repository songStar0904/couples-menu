// 时间工具（纯函数）

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

// ts(ms) -> 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm'
function fmt(ts, withTime) {
  const d = new Date(ts)
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base
}

// ts(ms) -> 'MM-DD HH:mm'（列表用）
function short(ts) {
  const d = new Date(ts)
  const now = new Date()
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (d.getFullYear() === now.getFullYear()) {
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 'YYYY-MM-DD' -> 周几
function weekDay(dateStr) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const d = new Date(String(dateStr).replace(/-/g, '/'))
  return isNaN(d.getTime()) ? '' : names[d.getDay()]
}

// 纪念日 -> 在一起天数（当天为第 1 天；未来日期返回 1）
function daysFrom(dateStr) {
  const from = new Date(String(dateStr).replace(/-/g, '/'))
  if (isNaN(from.getTime())) return 1
  const now = new Date(todayStr().replace(/-/g, '/'))
  const diff = Math.floor((now - from) / 86400000)
  return Math.max(1, diff + 1)
}

// 未来 N 天的日期串数组（下单期望日期选择用）
function upcomingDays(n) {
  const list = []
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 86400000)
    list.push(fmt(d.getTime()))
  }
  return list
}

module.exports = { fmt, short, todayStr, weekDay, daysFrom, upcomingDays }
