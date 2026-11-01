const theme = require('../utils/theme')
const store = require('../utils/store')

const TABS = [
  { path: '/pages/home/index', text: '首页', icon: 'home' },
  { path: '/pages/menu/index', text: '菜单', icon: 'book' },
  { path: '/pages/discover/index', text: '发现', icon: 'compass' },
  { path: '/pages/order/index', text: '订单', icon: 'receipt' },
  { path: '/pages/profile/index', text: '我的', icon: 'user' }
]

Component({
  data: {
    selected: 0,
    tabs: TABS,
    themeClass: ''
  },

  lifetimes: {
    attached() {
      this.setData({ themeClass: theme.cls() })
      this._unsub = store.subscribe(() => this.setData({ themeClass: theme.cls() }))
    },
    detached() {
      if (this._unsub) this._unsub()
    }
  },

  methods: {
    tap(e) {
      const idx = Number(e.currentTarget.dataset.index)
      if (idx === this.data.selected) return
      wx.switchTab({ url: TABS[idx].path })
    }
  }
})
