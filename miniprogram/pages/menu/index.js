const app = getApp()
const store = require('../../utils/store')
const theme = require('../../utils/theme')
const { categoryIcon, ERR } = require('../../utils/constants')
const util = require('../../utils/util')
const menuService = require('../../services/menu')

function groupDishes(dishes, categories) {
  const list = dishes || []
  const names = (categories || []).map((c) => c.name)
  list.forEach((d) => {
    if (d.category && names.indexOf(d.category) < 0) names.push(d.category)
  })
  return names
    .map((n) => ({
      name: n,
      icon: categoryIcon(n),
      dishes: list.filter((d) => d.category === n)
    }))
    .filter((g) => g.dishes.length)
}

Page({
  data: {
    themeClass: '',
    loading: true,
    view: 'partner', // partner 去点单 | mine 我的菜单
    couple: null,
    partnerMenu: null,
    groups: [],
    activeCategory: '',
    intoView: '',
    myMenu: null,
    myGroups: [],
    // 分类管理弹层
    catDialogShow: false,
    catRenaming: null
  },

  onLoad() {
    this._unsub = theme.watch(this)
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    app.waitReady().then(() => this.refresh())
  },

  async refresh() {
    const s = store.get()
    this.setData({ loading: true, couple: s.couple })
    try {
      const [my, partner] = await Promise.all([
        menuService.my(),
        s.couple ? menuService.partner({ loading: false, toast: false }).catch(() => null) : Promise.resolve(null)
      ])
      store.set({ user: { ...s.user, menuClosed: my.menuClosed } })
      my.categories = (my.categories || []).map((c) => ({ ...c, icon: categoryIcon(c.name) }))
      const groups = partner ? groupDishes(partner.dishes, partner.categories) : []
      this.setData({
        loading: false,
        myMenu: my,
        myGroups: groupDishes(my.dishes, my.categories),
        partnerMenu: partner,
        groups,
        activeCategory: groups.length ? groups[0].name : ''
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onViewChange(e) {
    this.setData({ view: e.detail.value })
  },

  onCategoryTap(e) {
    const name = e.currentTarget.dataset.name
    const index = this.data.groups.findIndex((g) => g.name === name)
    this.setData({ activeCategory: name, intoView: 'cat-' + index })
  },

  onOrderTap(e) {
    if (this.data.partnerMenu && this.data.partnerMenu.menuClosed) {
      util.toast('TA 今天休息 😴 暂不接单')
      return
    }
    const dish = e.detail.dish
    wx.navigateTo({ url: '/pages/order-confirm/index?dishId=' + dish._id })
  },

  onPartnerEmptyAction() {
    wx.switchTab({ url: '/pages/discover/index' })
  },

  /* ===== 我的菜单（管理）===== */
  onToggleClosed(e) {
    const v = e.detail.value
    menuService.setMenuClosed(v)
      .then(() => {
        store.set({ user: { ...store.get().user, menuClosed: v } })
        util.toast(v ? '今日休息已开启 😴' : '开工啦 👨‍🍳')
      })
      .catch(() => this.setData({ 'myMenu.menuClosed': !v }))
  },

  onMyDishTap(e) {
    const dish = e.detail.dish
    getApp().globalData.editingDish = dish
    wx.navigateTo({ url: '/pages/dish-edit/index?id=' + dish._id })
  },

  onMyDishAction(e) {
    const dish = e.detail.dish
    const next = dish.status === 'on' ? 'off' : 'on'
    menuService.toggleDish(dish._id, next)
      .then(() => {
        util.toast(next === 'on' ? '已上架 ✅' : '已下架')
        this.refresh()
      })
      .catch(() => {})
  },

  onAddDish() {
    getApp().globalData.editingDish = null
    wx.navigateTo({ url: '/pages/dish-edit/index' })
  },

  goStats() {
    util.toast('累计被点 ' + ((this.data.myMenu.stats && this.data.myMenu.stats.soldCount) || 0) + ' 单 ❤')
  },

  /* ===== 分类管理 ===== */
  openCatDialog() {
    this.setData({ catDialogShow: true })
  },
  closeCatDialog() {
    this.setData({ catDialogShow: false })
  },
  onRenameCat(e) {
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '重命名分类',
      editable: true,
      placeholderText: '输入新名称',
      success: (res) => {
        if (!res.confirm) return
        const newName = (res.content || '').trim()
        if (!newName || newName === name) return
        menuService.renameCategory(name, newName)
          .then(() => {
            util.toast('已重命名')
            this.setData({ catDialogShow: false })
            this.refresh()
          })
          .catch(() => {})
      }
    })
  },
  onDeleteCat(e) {
    const name = e.currentTarget.dataset.name
    this.selectComponent('#dialog').confirm({
      title: '删除分类「' + name + '」？',
      content: '分类下的菜品会移动到「其他」',
      confirmText: '删除'
    }).then((ok) => {
      if (!ok) return
      menuService.deleteCategory(name)
        .then(() => {
          util.toast('已删除')
          this.setData({ catDialogShow: false })
          this.refresh()
        })
        .catch(() => {})
    })
  },

  goBind() {
    wx.navigateTo({ url: '/pages/bind/index' })
  },

  noop() {}
})
