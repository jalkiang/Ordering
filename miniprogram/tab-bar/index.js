// components/tab-bar/index.js
Comment({

  /**
   * 页面的初始数据
   */
  data: {
    selected:0,
    color: "#7A7E83",
    selectedColor: "#3cc51f",
    list: [{
      pagePath: "pages/home/home",
      iconPath: "/images/icons/home_normal.png",
      selectedIconPath: "/images/icons/home_select.png",
      text: "首页"
    }, {
      pagePath: "/pages/mine/mine",
      iconPath: "/images/icons/mine_normal.png",
      selectedIconPath: "/images/icons/mine_select.png",
      text: "我的"
    }]
  },
  attached(){
 },
 methods:{
  switchTab(e){
    
  }
 }
})