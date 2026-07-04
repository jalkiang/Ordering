Page({
  data: {
    cartList: [],
    totalPrice: 0,
    totalCount: 0,
    context: {
      store_id: "",
      store_name: "",
      table_id: "",
      table_no: "",
    },
    peopleCount: 1,
    remark: "",
    submitting: false,
  },

  onLoad() {
    this.loadCheckoutData();
  },

  loadCheckoutData() {
    const rawCartList = wx.getStorageSync("checkout_cart") || [];
    const cartList = rawCartList.map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return {
        ...item,
        price,
        quantity,
        line_total: Number((price * quantity).toFixed(2)),
      };
    });
    const totalPrice = Number(wx.getStorageSync("checkout_price") || 0);
    const context = wx.getStorageSync("checkout_context") || {};
    const totalCount = cartList.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    this.setData({
      cartList,
      totalPrice: Number(totalPrice.toFixed(2)),
      totalCount,
      context: {
        store_id: context.store_id || "",
        store_name: context.store_name || "",
        table_id: context.table_id || "",
        table_no: context.table_no || "",
      },
    });
  },

  onPeopleCountInput(e) {
    const raw = Number(e.detail.value || 1);
    const peopleCount = Math.max(1, Math.min(20, raw || 1));
    this.setData({ peopleCount });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value || "" });
  },

  async onSubmitOrder() {
    if (this.data.submitting) return;
    if (!this.data.totalCount) {
      wx.showToast({
        title: "购物车为空",
        icon: "none",
      });
      return;
    }
    if (!this.data.context.store_id || !this.data.context.table_id) {
      wx.showToast({
        title: "缺少门店或桌台信息",
        icon: "none",
      });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: "提交中..." });
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "createScanOrder",
          data: {
            store_id: this.data.context.store_id,
            table_id: this.data.context.table_id,
            table_no: this.data.context.table_no,
            people_count: this.data.peopleCount,
            remark: this.data.remark,
            items: this.data.cartList,
          },
        },
      });

      const result = (res && res.result) || {};
      if (!result.success) {
        throw new Error(result.message || "提交失败");
      }

      wx.removeStorageSync("checkout_cart");
      wx.removeStorageSync("checkout_price");
      wx.removeStorageSync("checkout_context");

      wx.showModal({
        title: "下单成功",
        content: `订单号：${result.data.order_no}`,
        showCancel: false,
        success: () => {
          wx.redirectTo({
            url: "/pages/index/index",
          });
        },
      });
    } catch (e) {
      wx.showToast({
        title: e.message || "提交失败，请重试",
        icon: "none",
      });
    } finally {
      wx.hideLoading();
      this.setData({ submitting: false });
    }
  },
});
