// 用法：const ok = await this.selectComponent('#dialog').confirm({ title, content, confirmText })
Component({
  data: {
    show: false,
    title: '',
    content: '',
    confirmText: '确定',
    cancelText: '再想想',
    showCancel: true
  },
  methods: {
    show(opts = {}) {
      return new Promise((resolve) => {
        this._resolve = resolve
        this.setData({
          show: true,
          title: opts.title || '',
          content: opts.content || '',
          confirmText: opts.confirmText || '确定',
          cancelText: opts.cancelText || '再想想',
          showCancel: opts.showCancel !== false
        })
      })
    },
    hide(result) {
      if (this._resolve) {
        this._resolve(result)
        this._resolve = null
      }
      this.setData({ show: false })
    },
    onConfirm() {
      this.hide(true)
    },
    onCancel() {
      this.hide(false)
    },
    onMask() {
      this.hide(false)
    },
    noop() {}
  }
})
