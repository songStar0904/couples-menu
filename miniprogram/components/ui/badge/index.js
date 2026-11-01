Component({
  properties: {
    count: { type: Number, value: 0 }, // <=0 不显示
    dot: { type: Boolean, value: false }
  },
  data: {
    text: ''
  },
  observers: {
    count(n) {
      this.setData({ text: n > 99 ? '99+' : String(n) })
    }
  }
})
