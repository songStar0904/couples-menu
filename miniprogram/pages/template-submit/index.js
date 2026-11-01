const theme = require('../../utils/theme')
const util = require('../../utils/util')
const menuService = require('../../services/menu')
const discoverService = require('../../services/discover')

Page({
  data: {
    themeClass: '',
    loading: true,
    title: '',
    desc: '',
    myDishes: [], // { checked, name, type, category, price, desc }
    submitting: false
  },

  onLoad() {
    theme.apply(this)
    menuService.my()
      .then((my) => {
        this.setData({
          loading: false,
          myDishes: (my.dishes || [])
            .filter((d) => d.status === 'on')
            .map((d) => ({
              _id: d._id,
              name: d.name,
              type: d.type,
              category: d.category,
              price: d.price,
              desc: d.desc || '',
              emoji: '',
              checked: false
            }))
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onTitle(e) {
    this.setData({ title: e.detail.value })
  },
  onDesc(e) {
    this.setData({ desc: e.detail.value })
  },
  onToggle(e) {
    const i = Number(e.currentTarget.dataset.index)
    this.setData({ [`myDishes[${i}].checked`]: !this.data.myDishes[i].checked })
  },

  async onSubmit() {
    const { title, desc, myDishes, submitting } = this.data
    if (submitting) return
    if (!title.trim()) return util.toast('给模板起个名字')
    const items = myDishes.filter((d) => d.checked)
    if (!items.length) return util.toast('至少选择一道菜品')
    this.setData({ submitting: true })
    try {
      await discoverService.submitTemplate({
        title: title.trim(),
        desc: desc.trim(),
        items: items.map((d) => ({ name: d.name, type: d.type, category: d.category, price: d.price, desc: d.desc }))
      })
      util.vibrate()
      util.toast('投稿成功，等待审核 🎉')
      setTimeout(() => wx.navigateBack(), 700)
    } catch (e) { /* 已统一提示 */ }
    this.setData({ submitting: false })
  }
})
