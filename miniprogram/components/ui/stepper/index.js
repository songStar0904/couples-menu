Component({
  properties: {
    value: { type: Number, value: 0 },
    min: { type: Number, value: 0 },
    max: { type: Number, value: 9999 },
    step: { type: Number, value: 1 }
  },
  methods: {
    change(delta) {
      const v = Math.min(this.data.max, Math.max(this.data.min, this.data.value + delta))
      if (v === this.data.value) return
      this.setData({ value: v })
      this.triggerEvent('change', { value: v })
    },
    onMinus() {
      this.change(-this.data.step)
    },
    onPlus() {
      this.change(this.data.step)
    }
  }
})
