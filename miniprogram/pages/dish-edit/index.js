const theme = require('../../utils/theme')
const util = require('../../utils/util')
const menuService = require('../../services/menu')

Page({
  data: {
    themeClass: '',
    isEdit: false,
    saving: false,
    dish: { _id: '', name: '', type: 'dish', category: '拿手菜', price: 20, desc: '', image: '', status: 'on' },
    categories: [],
    typeOptions: [
      { label: '🍳 菜品', value: 'dish' },
      { label: '💝 心意服务', value: 'service' }
    ]
  },

  onLoad(options) {
    theme.apply(this)
    const editing = getApp().globalData.editingDish
    getApp().globalData.editingDish = null
    if (editing) {
      wx.setNavigationBarTitle({ title: '编辑菜品' })
      this.setData({ isEdit: true, dish: { ...editing } })
    } else {
      wx.setNavigationBarTitle({ title: '新建菜品' })
    }
    menuService.my({ loading: false, toast: false }).then((my) => {
      const cats = (my.categories || []).map((c) => c.name)
      if (editing && editing.category && cats.indexOf(editing.category) < 0) cats.push(editing.category)
      if (!editing && cats.length) this.setData({ 'dish.category': cats[0] })
      this.setData({ categories: cats })
    }).catch(() => {})
  },

  onTypeChange(e) {
    this.setData({ 'dish.type': e.detail.value })
  },
  onName(e) {
    this.setData({ 'dish.name': e.detail.value })
  },
  onDesc(e) {
    this.setData({ 'dish.desc': e.detail.value })
  },
  onPriceChange(e) {
    this.setData({ 'dish.price': e.detail.value })
  },
  onCategoryChange(e) {
    const cat = this.data.categories[Number(e.detail.value)]
    if (cat) this.setData({ 'dish.category': cat })
  },
  onAddCategory() {
    wx.showModal({
      title: '新建分类',
      editable: true,
      placeholderText: '输入分类名称',
      success: (res) => {
        if (!res.confirm) return
        const name = (res.content || '').trim()
        if (!name) return
        const cats = this.data.categories.slice()
        if (cats.indexOf(name) < 0) cats.push(name)
        this.setData({ categories: cats, 'dish.category': name })
      }
    })
  },
  onStatusChange(e) {
    this.setData({ 'dish.status': e.detail.value ? 'on' : 'off' })
  },

  async onChooseImage() {
    try {
      const res = await wx.chooseMedia({ count: 1, mediaType: ['image'], sizeType: ['compressed'] })
      const temp = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
      if (!temp) return
      wx.showLoading({ title: '上传中', mask: true })
      const extRaw = (temp.split('.').pop() || 'jpg').toLowerCase()
      const ext = ['jpg', 'jpeg', 'png', 'webp'].indexOf(extRaw) >= 0 ? extRaw : 'jpg'
      const up = await wx.cloud.uploadFile({
        cloudPath: 'dishes/' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '.' + ext,
        filePath: temp
      })
      wx.hideLoading()
      this.setData({ 'dish.image': up.fileID })
    } catch (e) {
      wx.hideLoading()
      util.toast('图片上传失败')
    }
  },
  onRemoveImage() {
    this.setData({ 'dish.image': '' })
  },

  async onSave() {
    const d = this.data.dish
    if (!d.name || !d.name.trim()) return util.toast('给菜品起个名字吧')
    if (!d.category) return util.toast('选择一个分类')
    this.setData({ saving: true })
    try {
      await menuService.saveDish({
        ...d,
        name: d.name.trim(),
        desc: (d.desc || '').trim()
      })
      util.vibrate()
      util.toast(this.data.isEdit ? '已保存 ✅' : '上架成功 🎉')
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) {
      // 错误已统一 toast
    }
    this.setData({ saving: false })
  },

  onDelete() {
    this.selectComponent('#dialog')
      .confirm({ title: '删除这道菜品？', content: '删除后无法恢复', confirmText: '删除' })
      .then(async (ok) => {
        if (!ok) return
        await menuService.deleteDish(this.data.dish._id).catch(() => {})
        util.toast('已删除')
        setTimeout(() => wx.navigateBack(), 500)
      })
  }
})
