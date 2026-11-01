// 统一云函数调用封装
// 约定：云函数返回 { code, msg, data }，code=0 成功
// opts: loading(是否显示loading) toast(失败是否自动toast)

async function call(name, action, data = {}, opts = {}) {
  const { loading = true, toast = true } = opts
  if (loading) wx.showLoading({ title: '加载中', mask: true })

  let result = null
  let error = null
  try {
    const res = await wx.cloud.callFunction({ name, data: { action, ...data } })
    const r = (res && res.result) || {}
    if (r.code !== 0) {
      error = new Error(r.msg || '操作失败，请稍后再试')
      error.code = r.code
    } else {
      result = r.data
    }
  } catch (e) {
    // callFunction 本身失败（网络/函数未部署）
    error = new Error('网络开小差了，请稍后再试')
    error.inner = e
  } finally {
    if (loading) wx.hideLoading()
  }

  if (error) {
    console.error(`[cloud] ${name}.${action}`, error.inner || error)
    if (toast) wx.showToast({ title: error.message, icon: 'none' })
    throw error
  }
  return result
}

module.exports = { call }
