// 通用工具（纯函数）

function debounce(fn, wait = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
}

function throttle(fn, gap = 500) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last < gap) return
    last = now
    fn.apply(this, args)
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

// 成功操作触感反馈（失败静默）
function vibrate(type = 'medium') {
  try {
    wx.vibrateShort({ type })
  } catch (e) { /* 部分机型不支持 */ }
}

function toast(title, icon = 'none') {
  wx.showToast({ title: String(title || '').slice(0, 20), icon })
}

module.exports = { debounce, throttle, clamp, isBlank, vibrate, toast }
