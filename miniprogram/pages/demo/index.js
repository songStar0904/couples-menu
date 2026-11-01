const theme = require('../../utils/theme')

Page({
  data: {
    themeClass: '',
    segValue: 'a',
    stepValue: 20,
    showSkeleton: false,
    dialogText: ''
  },

  onLoad() {
    theme.apply(this)
  },

  onSeg(e) {
    this.setData({ segValue: e.detail.value })
  },
  onStep(e) {
    this.setData({ stepValue: e.detail.value })
  },
  onButtonTap() {
    wx.showToast({ title: '按钮被点击', icon: 'none' })
  },
  onCellTap() {
    wx.showToast({ title: 'Cell 被点击', icon: 'none' })
  },
  onToggleSkeleton() {
    this.setData({ showSkeleton: !this.data.showSkeleton })
  },
  async onDialog() {
    const ok = await this.selectComponent('#dialog').confirm({
      title: '对话框标题',
      content: '这里是确认内容，支持一段较长的说明文字。',
      confirmText: '确定'
    })
    this.setData({ dialogText: ok ? '你点击了「确定」' : '你点击了「取消」' })
  },
  onBadgeTap() {
    wx.showToast({ title: '心意值胶囊', icon: 'none' })
  }
})
