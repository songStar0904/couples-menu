const { call } = require('./cloud')

module.exports = {
  create(data) {
    // { dishId, note, wishDate }
    return call('order', 'create', data)
  },
  accept(id) {
    return call('order', 'accept', { id })
  },
  complete(id) {
    return call('order', 'complete', { id })
  },
  cancel(id) {
    return call('order', 'cancel', { id })
  },
  confirmCancel(id) {
    return call('order', 'confirmCancel', { id })
  },
  declineCancel(id) {
    return call('order', 'declineCancel', { id })
  },
  list(data) {
    // { tab: 'bought' | 'received', cursor? }
    return call('order', 'list', data, { loading: false })
  },
  detail(id) {
    return call('order', 'detail', { id })
  },
  review(id, data) {
    // { rating, message }
    return call('order', 'review', { id, ...data })
  },
  summary() {
    return call('order', 'summary', {}, { loading: false, toast: false })
  }
}
