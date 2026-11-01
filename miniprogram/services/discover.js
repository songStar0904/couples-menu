const { call } = require('./cloud')

module.exports = {
  listTemplates() {
    return call('discover', 'listTemplates')
  },
  templateDetail(id) {
    return call('discover', 'templateDetail', { id })
  },
  importTemplate(id) {
    return call('discover', 'importTemplate', { id })
  },
  submitTemplate(data) {
    // { title, desc, items }
    return call('discover', 'submitTemplate', data)
  }
}
