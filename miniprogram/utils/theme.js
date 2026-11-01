// 主题助手：页面 onShow 时调用 apply(this) 同步主题类名到根节点
const store = require('./store')

function cls() {
  return (store.get().theme || 'pink') === 'blue' ? 'theme-blue' : ''
}

function apply(page) {
  page.setData({ themeClass: cls() })
}

// 主题变更时订阅刷新（页面需保存 unsubscribe 并在 onUnload 解绑）
function watch(page) {
  apply(page)
  return store.subscribe(() => apply(page))
}

module.exports = { cls, apply, watch }
