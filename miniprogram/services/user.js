const { call } = require('./cloud')

module.exports = {
  // 静默登录，返回 { user, couple, partner }
  login(opts) {
    return call('user', 'login', {}, { loading: false, toast: false, ...opts })
  },
  updateProfile(data) {
    return call('user', 'updateProfile', data)
  },
  updateSettings(data) {
    return call('user', 'updateSettings', data)
  }
}
