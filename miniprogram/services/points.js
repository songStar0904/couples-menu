const { call } = require('./cloud')

module.exports = {
  // { balance, todaySigned, streak, monthCount, tasks, signDates }
  overview() {
    return call('points', 'overview')
  },
  sign() {
    return call('points', 'sign')
  },
  ledger(data) {
    // { cursor? }
    return call('points', 'ledger', data, { loading: false })
  }
}
