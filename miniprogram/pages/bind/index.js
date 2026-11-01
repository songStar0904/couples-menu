const app = getApp()
const store = require('../../utils/store')
const theme = require('../../utils/theme')
const time = require('../../utils/time')
const util = require('../../utils/util')
const coupleService = require('../../services/couple')

Page({
  data: {
    themeClass: '',
    loading: true,
    couple: null,
    partner: null,
    days: 0,
    invite: null, // { code, expireInMin }
    inputCode: '',
    binding: false
  },

  onLoad() {
    theme.apply(this)
  },

  onShow() {
    app.waitReady().then(() => {
      const s = store.get()
      this.setData({
        loading: false,
        couple: s.couple,
        partner: s.partner,
        days: s.couple && s.couple.togetherDate ? time.daysFrom(s.couple.togetherDate) : 0
      })
    })
  },

  /* ===== 已绑定 ===== */
  async onUnbind() {
    const ok = await this.selectComponent('#dialog').confirm({
      title: '解除绑定？',
      content: '解绑后你们将看不到彼此的菜单和订单，数据会保留。确定要解绑吗？',
      confirmText: '狠心解绑'
    })
    if (!ok) return
    try {
      await coupleService.unbind()
      await app.waitReady()
      // 重新登录拉取最新关系
      const data = await coupleService.info()
      store.set({ couple: null, partner: null, user: { ...store.get().user, coupleId: '' } })
      void data
      util.toast('已解绑')
      this.setData({ couple: null, partner: null })
    } catch (e) { /* 已统一提示 */ }
  },

  /* ===== 未绑定 ===== */
  async onCreateInvite() {
    try {
      const r = await coupleService.createInvite()
      this.setData({ invite: r })
    } catch (e) { /* 已统一提示 */ }
  },

  onCopyCode() {
    if (!this.data.invite) return
    wx.setClipboardData({
      data: this.data.invite.code,
      success: () => util.toast('口令已复制，快发给 TA')
    })
  },

  onInputCode(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

  async onBind() {
    const code = this.data.inputCode.trim()
    if (code.length !== 6) return util.toast('请输入 6 位口令')
    if (this.data.binding) return
    this.setData({ binding: true })
    try {
      await coupleService.bindByCode(code)
      const data = await coupleService.info({ loading: false })
      store.set({ couple: data.couple, partner: data.partner, user: { ...store.get().user, coupleId: data.couple._id, points: data.user ? data.user.points : store.get().user.points } })
      util.vibrate()
      this.setData({ couple: data.couple, partner: data.partner, days: data.couple.togetherDate ? time.daysFrom(data.couple.togetherDate) : 1 })
      wx.showToast({ title: '💞 绑定成功！', icon: 'none' })
    } catch (e) { /* 已统一提示 */ }
    this.setData({ binding: false })
  },

  noop() {}
})
