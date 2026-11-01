// 心意值胶囊：❤ 余额，点击由父级处理
Component({
  properties: {
    value: { type: null, value: 0 }
  },
  methods: {
    onTap() {
      this.triggerEvent('tap')
    }
  }
})
