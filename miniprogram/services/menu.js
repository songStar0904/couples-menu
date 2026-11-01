const { call } = require('./cloud')

module.exports = {
  // 我的菜单：{ dishes, categories, menuClosed, stats }
  my() {
    return call('menu', 'my')
  },
  // 伴侣上架菜单：{ dishes, categories, menuClosed, partner }
  partner() {
    return call('menu', 'partner')
  },
  saveDish(dish) {
    return call('menu', 'saveDish', { dish })
  },
  toggleDish(id, status) {
    return call('menu', 'toggleDish', { id, status })
  },
  deleteDish(id) {
    return call('menu', 'deleteDish', { id })
  },
  setMenuClosed(menuClosed) {
    return call('menu', 'setMenuClosed', { menuClosed })
  },
  renameCategory(oldName, newName) {
    return call('menu', 'renameCategory', { oldName, newName })
  },
  deleteCategory(name) {
    return call('menu', 'deleteCategory', { name })
  }
}
