Component({
  data: {
    selected: 0,
    color: '#7A7E83',
    selectedColor: '#0a59f7',
    list: [{
      pagePath: '/pages/home/home',
      iconPath: '/images/icons/home_normal.png',
      selectedIconPath: '/images/icons/home_select.png',
      text: '首页'
    },
    {
      pagePath: '/pages/page_order/page_order',
      iconPath: '/images/icons/page_order_normal.png',
      selectedIconPath: '/images/icons/page_order_select.png',
      text: '订单'
    },
     {
      pagePath: '/pages/page_mine/page_mine',
      iconPath: '/images/icons/mine_normal.png',
      selectedIconPath: '/images/icons/mine_select.png',
      text: '我的'
    }]
  },
  methods: {
    switchTab(e) {
      const { path, index } = e.currentTarget.dataset
      wx.switchTab({ url: path })
      this.setData({
        selected: Number(index)
      })
    }
  }
})
