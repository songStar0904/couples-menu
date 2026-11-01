// 骨架屏：type = list(列表) | detail(详情) | cards(卡片流)
Component({
  properties: {
    type: { type: String, value: 'list' },
    rows: { type: Number, value: 3 }
  },
  data: {
    list: []
  },
  observers: {
    rows(n) {
      const list = []
      for (let i = 0; i < n; i++) list.push(i)
      this.setData({ list })
    }
  }
})
