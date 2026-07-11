Page({
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    this.fetchBannerImages();
  },
  order_food:function(){
    wx.navigateTo({
      url:'/pages/index/index'
    })
  },
  data:{
    background:[

    ],
    indicatorDots: true,
    autoplay: true,
    interval: 5000,
    duration: 500,
  },
  onLoad(){
    this.fetchBannerImages();
  },
  
  async fetchBannerImages(){
    try{
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data:{type:"getBannerImg"},
      });
      const result = (res && res.result) || {};
      if (result.success && Array.isArray(result.data) && result.data.length){
        this.setData({background:result.data});
      } else {
        console.warn("getBannerImg no valid files:", result);
      }
    }
    catch(e){
      console.error("fetchBannerImages failed",e);
    }
  }
})  
