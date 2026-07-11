Page({
  data: {
    loading: false,
    orderId: "",
    order: null,
  },

  async onLoad(options) {
    const orderId = options.order_id || "";
    if (!orderId) {
      wx.showToast({
        title: "缺少订单参数",
        icon: "none",
      });
      return;
    }
    this.setData({ orderId });
    await this.fetchOrderDetail();
  },

  async onPullDownRefresh() {
    await this.fetchOrderDetail();
    wx.stopPullDownRefresh();
  },

  getStatusText(status) {
    const map = {
      pending: "待接单",
      cooking: "制作中",
      completed: "已完成",
      cancelled: "已取消",
    };
    return map[status] || status || "-";
  },

  async fetchOrderDetail() {
    if (!this.data.orderId) return;
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getUserOrderDetail",
          data: {
            order_id: this.data.orderId,
          },
        },
      });
      const result = (res && res.result) || {};
      if (!result.success) {
        throw new Error(result.message || "加载失败");
      }
      const order = result.data || {};
      this.setData({
        order: {
          ...order,
          created_at_text: (order.created_at || "").replace("T", " ").slice(0, 16),
          status_text: this.getStatusText(order.order_status),
          pay_text: order.pay_status === "paid" ? "已支付" : "待支付",
          can_pay: order.pay_status !== "paid",
          can_cancel: order.order_status === "pending",
        },
      });
    } catch (e) {
      const msg = e.message || "加载失败";
      if (msg.includes("手机号授权登录")) {
        wx.showModal({
          title: "请先登录",
          content: "查看订单详情前需要先完成微信手机号授权登录，是否前往我的页面？",
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: "/pages/page_mine/page_mine" });
            }
          },
        });
      } else {
        wx.showToast({
          title: msg,
          icon: "none",
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onActionTap(e) {
    const action = e.currentTarget.dataset.action;
    if (!action || !this.data.orderId) return;
    const actionMap = {
      pay: { title: "确认支付", content: "确认模拟支付该订单？" },
      cancel: { title: "取消订单", content: "确认取消该订单？" },
    };
    const config = actionMap[action];
    if (!config) return;

    wx.showModal({
      title: config.title,
      content: config.content,
      success: async (res) => {
        if (!res.confirm) return;
        await this.runOrderAction(action);
      },
    });
  },

  async runOrderAction(action) {
    wx.showLoading({ title: "处理中..." });
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "userOrderAction",
          data: {
            order_id: this.data.orderId,
            action,
          },
        },
      });
      const result = (res && res.result) || {};
      if (!result.success) {
        throw new Error(result.message || "操作失败");
      }
      wx.showToast({ title: "操作成功", icon: "success" });
      await this.fetchOrderDetail();
    } catch (e) {
      wx.showToast({
        title: e.message || "操作失败",
        icon: "none",
      });
    } finally {
      wx.hideLoading();
    }
  },
});
