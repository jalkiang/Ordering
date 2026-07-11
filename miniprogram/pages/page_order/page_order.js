// pages/page_order/page_order.js
Page({
  data: {
    loading: false,
    storeId: "",
    storeName: "",
    statusTabs: [
      { label: "全部", value: "all" },
      { label: "进行中", value: "ongoing" },
      { label: "已完成", value: "completed" },
      { label: "已取消", value: "cancelled" },
    ],
    currentStatus: "all",
    orders: [],
    paddingBottom: 0,
  },

  async onLoad() {
    this.loadOrderContext();
    await this.fetchOrders();
  },

  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadOrderContext();
    await this.fetchOrders();
  },

  async onPullDownRefresh() {
    await this.fetchOrders();
    wx.stopPullDownRefresh();
  },

  loadOrderContext() {
    const orderContext = wx.getStorageSync("order_context") || {};
    const checkoutContext = wx.getStorageSync("checkout_context") || {};
    this.setData({
      storeId: orderContext.store_id || checkoutContext.store_id || "",
      storeName: orderContext.store_name || checkoutContext.store_name || "",
    });
  },

  async fetchOrders() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: "quickstartFunctions",
        data: {
          type: "listUserOrders",
          data: {
            store_id: this.data.storeId,
            status_filter: this.data.currentStatus,
            page_no: 1,
            page_size: 50,
          },
        },
      });
      const result = (res && res.result) || {};
      if (!result.success) {
        throw new Error(result.message || "加载订单失败");
      }
      const orders = (result.data.list || []).map((order) => ({
        ...order,
        created_at_text: (order.created_at || "").replace("T", " ").slice(0, 16),
        status_text: this.getStatusText(order.order_status),
        pay_text: order.pay_status === "paid" ? "已支付" : "待支付",
        store_display_name: order.store_name || this.data.storeName || "未知门店",
        first_item_text: this.getFirstItemText(order.items || []),
        total_quantity: Number(order.item_count || 0),
      }));
      this.setData({ orders });
    } catch (e) {
      const msg = e.message || "加载失败";
      if (msg.includes("手机号授权登录")) {
        wx.showModal({
          title: "请先登录",
          content: "查看订单前需要先完成微信手机号授权登录，是否前往我的页面？",
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({
                url: "/pages/page_mine/page_mine",
              });
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

  getStatusText(status) {
    const map = {
      pending: "待接单",
      cooking: "制作中",
      completed: "已完成",
      cancelled: "已取消",
    };
    return map[status] || status || "-";
  },

  getFirstItemText(items) {
    if (!items || !items.length) return "暂无商品";
    const first = items[0];
    const base = first.food_name || "未命名商品";
    const spec = first.spec_key ? `(${first.spec_key})` : "";
    if (items.length === 1) return `${base}${spec}`;
    return `${base}${spec} 等${items.length}项`;
  },

  onStatusTabTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value || value === this.data.currentStatus) return;
    this.setData({ currentStatus: value }, () => this.fetchOrders());
  },

  onOrderCardTap(e) {
    const orderId = e.currentTarget.dataset.orderId;
    if (!orderId) return;
    wx.navigateTo({
      url: `/pages/order_detail/order_detail?order_id=${orderId}`,
    });
  },
});