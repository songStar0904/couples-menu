const store = require('./utils/store')
const userService = require('./services/user')

App({
  globalData: {},

  onLaunch() {
    if (!wx.cloud) {
      console.error('当前基础库过低，无法使用云能力，请升级微信')
      return
    }
    const { CLOUD_ENV_ID } = require('./config/env')
    wx.cloud.init(CLOUD_ENV_ID ? { env: CLOUD_ENV_ID, traceUser: true } : { traceUser: true })
    this.bootstrap()
  },

  // 静默登录建档，全局状态注入 user/couple/partner/theme
  async bootstrap() {
    try {
      const data = await userService.login({ loading: false, toast: false })
      store.set({
        user: data.user,
        couple: data.couple,
        partner: data.partner,
        theme: data.user.settings.theme || 'pink'
      })
    } catch (e) {
      // 弱网/云环境未配置时页面会展示兜底空态，这里只记录
      console.error('[app] bootstrap 登录失败', e)
    } finally {
      this._ready = true
      const resolvers = this._resolvers || []
      this._resolvers = []
      resolvers.forEach((fn) => fn())
    }
  },

  // 页面等待全局登录态就绪（避免 onShow 拿到空 user）
  waitReady() {
    if (this._ready) return Promise.resolve()
    return new Promise((resolve) => {
      this._resolvers = this._resolvers || []
      this._resolvers.push(resolve)
    })
  }
})
