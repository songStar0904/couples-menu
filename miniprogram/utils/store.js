// 轻量全局状态：user / couple / partner / theme
// 页面用法：const store = require('utils/store'); store.subscribe(fn) 返回解绑函数

const state = {
  user: null,    // 我的资料 { nickname, avatar, motto, points, coupleId, categories, menuClosed, settings }
  couple: null,  // 关系 { _id, members, togetherDate, status }
  partner: null, // 伴侣资料 { nickname, avatar, motto }，未绑定为 null
  theme: 'pink'  // 'pink' | 'blue'
}

const listeners = new Set()

function get() {
  return state
}

function set(patch) {
  Object.assign(state, patch)
  listeners.forEach((fn) => {
    try {
      fn(state)
    } catch (e) {
      console.error('[store] listener error', e)
    }
  })
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

module.exports = { get, set, subscribe }
