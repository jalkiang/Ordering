Page({
  data: {
    user: null,
    loggingIn: false,
    isDevEnv: false,
  },

  onLoad() {
    this.detectEnv();
    this.loadUser();
  },

  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2,
      });
    }
    this.loadUser();
  },

  detectEnv() {
    let isDevEnv = false;
    try {
      const info = wx.getAccountInfoSync();
      const envVersion = info?.miniProgram?.envVersion;
      isDevEnv = envVersion === "develop" || envVersion === "trial";
    } catch (e) {
      isDevEnv = true;
    }
    this.setData({ isDevEnv });
  },

  loadUser() {
    const app = getApp();
    const cached = wx.getStorageSync("current_user");
    this.setData({
      user: app.globalData.currentUser || cached || null,
    });
  },

  async onGetPhoneNumber(e) {
    if (this.data.loggingIn) return;
    const code = e && e.detail && e.detail.code;
    const errMsg = (e && e.detail && e.detail.errMsg) || "";
    if (!code) {
      console.error("getPhoneNumber no code:", e);
      wx.showToast({
        title: errMsg.includes("deny")
          ? "已取消授权"
          : "获取手机号失败，请真机重试",
        icon: "none",
      });
      if (errMsg && !errMsg.includes("deny")) {
        wx.showModal({
          title: "手机号授权失败",
          content: errMsg,
          showCancel: false,
        });
      }
      return;
    }

    this.setData({ loggingIn: true });
    try {
      const app = getApp();
      const user = await app.loginWithPhoneCode(code, {});
      this.setData({ user });
      wx.showToast({
        title: "登录成功",
        icon: "success",
      });
    } catch (e) {
      console.error("loginWithPhoneCode failed:", e);
      wx.showToast({
        title: e.message || "登录失败",
        icon: "none",
      });
      if (e && e.message) {
        wx.showModal({
          title: "登录失败详情",
          content: String(e.message),
          showCancel: false,
        });
      }
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  async onMockLoginTap() {
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true });
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "devMockLogin",
        },
      });
      const result = (res && res.result) || {};
      if (!result.success) {
        throw new Error(result.message || "测试登录失败");
      }
      const app = getApp();
      app.globalData.currentUser = result.data || null;
      wx.setStorageSync("current_user", result.data || null);
      this.setData({ user: result.data || null });
      wx.showToast({
        title: "测试登录成功",
        icon: "success",
      });
    } catch (e) {
      wx.showToast({
        title: e.message || "测试登录失败",
        icon: "none",
      });
    } finally {
      this.setData({ loggingIn: false });
    }
  },
});
