const theme = require('../../utils/theme')
const time = require('../../utils/time')
const util = require('../../utils/util')
const { POINT_TYPE } = require('../../utils/constants')
const pointsService = require('../../services/points')

Page({
  data: {
    themeClass: '',
    loading: true,
    tab: 'sign', // sign 签到 | ledger 明细
    overview: null,
    calYear: 2026,
    calMonth: 1,
    signDates: [],
    ledgerList: [],
    ledgerCursor: null,
    ledgerFinished: false
  },

  onLoad() {
    theme.apply(this)
    const now = new Date()
    this.setData({ calYear: now.getFullYear(), calMonth: now.getMonth() + 1 })
  },

  onShow() {
    this.refresh()
  },

  async refresh() {
    this.setData({ loading: true })
    try {
      const overview = await pointsService.overview()
      this.setData({
        loading: false,
        overview,
        signDates: overview.signDates || []
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onTabChange(e) {
    const tab = e.detail.value
    this.setData({ tab })
    if (tab === 'ledger' && !this.data.ledgerList.length) this.loadLedger(true)
  },

  async onSign() {
    if (this.data.overview && this.data.overview.todaySigned) return
    try {
      const r = await pointsService.sign()
      util.vibrate()
      util.toast(`签到成功 +${r.reward} ❤`)
      this.refresh()
    } catch (e) { /* 已统一提示 */ }
  },

  onPrevMonth() {
    let { calYear, calMonth } = this.data
    calMonth -= 1
    if (calMonth < 1) { calMonth = 12; calYear -= 1 }
    this.setData({ calYear, calMonth })
  },
  onNextMonth() {
    let { calYear, calMonth } = this.data
    calMonth += 1
    if (calMonth > 12) { calMonth = 1; calYear += 1 }
    this.setData({ calYear, calMonth })
  },

  async loadLedger(reset) {
    try {
      const r = await pointsService.ledger({ cursor: reset ? null : this.data.ledgerCursor })
      const list = r.list.map((it) => ({ ...it, timeText: time.short(it.createdAt) }))
      this.setData({
        ledgerList: reset ? list : this.data.ledgerList.concat(list),
        ledgerCursor: r.nextCursor,
        ledgerFinished: r.finished
      })
    } catch (e) { /* 忽略 */ }
  },

  onReachBottom() {
    if (this.data.tab === 'ledger') this.loadLedger(false)
  }
})
