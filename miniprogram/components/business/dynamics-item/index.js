const { DYNAMIC } = require('../../../utils/constants')
const time = require('../../../utils/time')

Component({
  properties: {
    item: { type: Object, value: {} } // { type, actorName, text, createdAt }
  },
  data: {
    icon: 'sparkle',
    timeText: ''
  },
  observers: {
    item(item) {
      if (!item) return
      this.setData({
        icon: (DYNAMIC[item.type] && DYNAMIC[item.type].icon) || 'sparkle',
        timeText: item.createdAt ? time.short(item.createdAt) : ''
      })
    }
  }
})
