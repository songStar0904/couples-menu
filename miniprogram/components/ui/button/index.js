Component({
  properties: {
    type: { type: String, value: 'primary' }, // primary | soft | danger | ghost
    size: { type: String, value: 'md' }, // lg | md | sm
    loading: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false }
  },
  methods: {
    onTap() {
      if (this.data.disabled || this.data.loading) return
      this.triggerEvent('tap')
    }
  }
})
