// options: ['a', 'b'] 或 [{ label, value }]
Component({
  properties: {
    options: { type: Array, value: [] },
    value: { type: null, value: '' }
  },
  data: {
    labels: [],
    index: 0
  },
  observers: {
    'options, value'(options, value) {
      const labels = (options || []).map((o) => (typeof o === 'object' ? o.label : o))
      const values = (options || []).map((o) => (typeof o === 'object' ? o.value : o))
      let index = values.indexOf(value)
      if (index < 0) index = 0
      this.setData({ labels, index })
    }
  },
  methods: {
    onTap(e) {
      const index = Number(e.currentTarget.dataset.index)
      const opt = this.data.options[index]
      if (opt === undefined) return
      const value = typeof opt === 'object' ? opt.value : opt
      if (value === this.data.value) return
      this.triggerEvent('change', { value })
    }
  }
})
