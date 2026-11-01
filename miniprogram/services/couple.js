const { call } = require('./cloud')

module.exports = {
  createInvite() {
    return call('couple', 'createInvite')
  },
  bindByCode(code) {
    return call('couple', 'bindByCode', { code })
  },
  unbind() {
    return call('couple', 'unbind')
  },
  info() {
    return call('couple', 'info')
  },
  updateTogetherDate(date) {
    return call('couple', 'updateTogetherDate', { date })
  },
  dynamics(opts) {
    return call('couple', 'dynamics', {}, opts)
  }
}
