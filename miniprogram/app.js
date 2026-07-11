// app.js
App({
  onLaunch: async function () {
    const sysInfo = wx.getSystemInfoSync();
    const safeBottom =  sysInfo.screenHeight - sysInfo.safeArea.bottom;
    this.globalData = {
      // env 参数说明：
      // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
      // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
      env: "cloud1-d7gt62ex18961a7ea",
      currentUser: null,
      tabBarHeight: 50 + safeBottom
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
      await this.refreshCurrentUser();
    }
  },

  async refreshCurrentUser() {
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getLoginUser",
        },
      });
      const result = (res && res.result) || {};
      if (result.success) {
        this.globalData.currentUser = result.data || null;
        wx.setStorageSync("current_user", result.data || null);
      }
    } catch (e) {
      console.error("refreshCurrentUser failed:", e);
    }
  },

  async loginWithPhoneCode(phoneCode, profile) {
    const res = await wx.cloud.callFunction({
      name: "quickstartFunctions",
      data: {
        type: "loginUserWithPhone",
        data: {
          phone_code: phoneCode,
          profile: profile || {},
        },
      },
    });
    const result = (res && res.result) || {};
    if (result.success) {
      this.globalData.currentUser = result.data || null;
      wx.setStorageSync("current_user", result.data || null);
      return result.data || null;
    }
    throw new Error(result.message || "登录失败");
  },
});
