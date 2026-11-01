// 月历签到视图
Component({
  properties: {
    year: { type: Number, value: 2026 },
    month: { type: Number, value: 1 }, // 1-12
    signed: { type: Array, value: [] }, // ['YYYY-MM-DD']
    today: { type: String, value: '' } // 'YYYY-MM-DD'
  },
  data: {
    weekHeads: ['日', '一', '二', '三', '四', '五', '六'],
    cells: []
  },
  observers: {
    'year, month, signed, today'(year, month, signed) {
      const days = new Date(year, month, 0).getDate()
      const firstWeekDay = new Date(year, month - 1, 1).getDay()
      const signedSet = new Set(signed || [])
      const cells = []
      for (let i = 0; i < firstWeekDay; i++) cells.push({ day: 0 })
      for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        cells.push({ day: d, dateStr, isSigned: signedSet.has(dateStr), isToday: dateStr === this.data.today })
      }
      this.setData({ cells })
    }
  }
})
