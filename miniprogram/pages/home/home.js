Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },
  order_food:function(){
    wx.navigateTo({
      url:'/pages/index/index'
    })
  }
})
