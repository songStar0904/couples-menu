const store = require('../../utils/store')
const theme = require('../../utils/theme')
const util = require('../../utils/util')
const userService = require('../../services/user')

Page({
  data: {
    themeClass: '',
    nickname: '',
    avatar: '',
    motto: '',
    saving: false
  },

  onLoad() {
    theme.apply(this)
    const user = store.get().user
    if (user) {
      this.setData({
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        motto: user.motto || ''
      })
    }
  },

  // 微信头像选择能力
  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl
    if (!tempPath) return
    wx.showLoading({ title: '上传中', mask: true })
    wx.cloud
      .uploadFile({
        cloudPath: 'avatars/' + Date.now() + '-' + Math.floor(Math.random() * 1000000) + '.jpg',
        filePath: tempPath
      })
      .then((up) => {
        wx.hideLoading()
        this.setData({ avatar: up.fileID })
      })
      .catch(() => {
        wx.hideLoading()
        util.toast('头像上传失败')
      })
  },

  onNickname(e) {
    this.setData({ nickname: e.detail.value })
  },
  onMotto(e) {
    this.setData({ motto: e.detail.value })
  },

  async onSave() {
    const { nickname, avatar, motto, saving } = this.data
    if (saving) return
    if (!nickname.trim()) return util.toast('昵称不能为空')
    this.setData({ saving: true })
    try {
      await userService.updateProfile({ nickname: nickname.trim(), avatar, motto: motto.trim() })
      store.set({ user: { ...store.get().user, nickname: nickname.trim(), avatar, motto: motto.trim() } })
      util.vibrate()
      util.toast('已保存 ✅')
      setTimeout(() => wx.navigateBack(), 600)
    } catch (e) { /* 已统一提示 */ }
    this.setData({ saving: false })
  }
})
