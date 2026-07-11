const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

const getUserByOpenid = async (openid) => {
  try {
    const res = await db.collection("users").doc(openid).get();
    return res.data || null;
  } catch (e) {
    return null;
  }
};

const upsertById = async (collectionName, record) => {
  const recordId = record && record._id;
  if (!recordId) {
    throw new Error(`upsertById missing _id for ${collectionName}`);
  }
  const { _id, ...dataWithoutId } = record;

  // 优先使用 set 覆盖，失败时回退为 where+update / add，兼容不同运行环境
  try {
    await db.collection(collectionName).doc(recordId).set({
      data: dataWithoutId,
    });
    return;
  } catch (setErr) {
    const existing = await db
      .collection(collectionName)
      .where({ _id: recordId })
      .limit(1)
      .get();

    if (existing.data && existing.data.length > 0) {
      await db.collection(collectionName).where({ _id: recordId }).update({
        data: dataWithoutId,
      });
    } else {
      await db.collection(collectionName).doc(recordId).set({
        data: dataWithoutId,
      });
    }
  }
};

const ensureCollections = async (collectionNames) => {
  for (const name of collectionNames) {
    try {
      await db.createCollection(name);
    } catch (e) {
      // 集合已存在时忽略
    }
  }
};

const seedScanOrderTestData = async () => {
  const now = new Date().toISOString();
  const collectionNames = [
    "stores",
    "dining_tables",
    "categories",
    "foods",
    "orders",
    "order_events",
  ];

  await ensureCollections(collectionNames);

  const stores = [
    {
      _id: "store_main_001",
      name: "测试门店一号店",
      logo: "",
      phone: "13800000001",
      address: "上海市浦东新区测试路 88 号",
      business_hours: "09:00-22:00",
      status: 1,
      service_fee_rate: 0,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "store_main_002",
      name: "测试门店二号店",
      logo: "",
      phone: "13800000002",
      address: "上海市徐汇区演示街 66 号",
      business_hours: "10:00-21:30",
      status: 1,
      service_fee_rate: 0,
      created_at: now,
      updated_at: now,
    },
  ];

  const diningTables = [
    {
      _id: "table_a001",
      store_id: "store_main_001",
      table_no: "A001",
      table_name: "大厅 A001",
      area: "大厅",
      capacity: 4,
      qr_scene: "table_id=table_a001",
      qr_code_url: "",
      status: 1,
      current_order_id: "order_test_001",
      created_at: now,
      updated_at: now,
    },
    {
      _id: "table_b201",
      store_id: "store_main_002",
      table_no: "B201",
      table_name: "包间 B201",
      area: "包间",
      capacity: 8,
      qr_scene: "table_id=table_b201",
      qr_code_url: "",
      status: 1,
      current_order_id: "order_test_002",
      created_at: now,
      updated_at: now,
    },
  ];

  const categories = [
    {
      _id: "category_test_noodle",
      store_id: "store_main_001",
      name: "面食",
      sort: 1,
      status: 1,
      created_at: now,
      updated_at: now,
    },
    {
      _id: "category_test_drink",
      store_id: "store_main_001",
      name: "饮品",
      sort: 2,
      status: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const foods = [
    {
      _id: "food_test_001",
      store_id: "store_main_001",
      category_id: "category_test_noodle",
      name: "招牌牛肉面",
      image: "",
      description: "牛骨汤底，现煮热面",
      price: 24,
      status: 1,
      sort: 1,
      hasSpec: true,
      spec_groups: [
        {
          title: "份量",
          list: ["标准", "大份"],
          price_adds: [0, 4],
        },
        {
          title: "辣度",
          list: ["不辣", "微辣"],
          price_adds: [0, 0],
        },
      ],
      created_at: now,
      updated_at: now,
    },
    {
      _id: "food_test_002",
      store_id: "store_main_001",
      category_id: "category_test_drink",
      name: "柠檬茶",
      image: "",
      description: "清爽解腻",
      price: 12,
      status: 1,
      sort: 1,
      hasSpec: true,
      spec_groups: [
        {
          title: "冰量",
          list: ["正常冰", "少冰"],
          price_adds: [0, 0],
        },
        {
          title: "甜度",
          list: ["正常糖", "少糖"],
          price_adds: [0, 0],
        },
      ],
      created_at: now,
      updated_at: now,
    },
  ];

  const orders = [
    {
      _id: "order_test_001",
      order_no: "SO202606291001",
      store_id: "store_main_001",
      table_id: "table_a001",
      table_no: "A001",
      openid: "test_openid_001",
      user_nickname: "测试用户一",
      user_phone: "",
      order_type: "dine_in",
      people_count: 2,
      remark: "少放葱",
      items: [
        {
          food_id: "food_test_001",
          food_name: "招牌牛肉面",
          image: "",
          category_id: "category_test_noodle",
          quantity: 1,
          unit_price: 28,
          total_price: 28,
          spec_key: "大份/微辣",
          specs: [
            { group_name: "份量", value: "大份", price_add: 4 },
            { group_name: "辣度", value: "微辣", price_add: 0 },
          ],
          remark: "",
        },
        {
          food_id: "food_test_002",
          food_name: "柠檬茶",
          image: "",
          category_id: "category_test_drink",
          quantity: 2,
          unit_price: 12,
          total_price: 24,
          spec_key: "正常冰/少糖",
          specs: [
            { group_name: "冰量", value: "正常冰", price_add: 0 },
            { group_name: "甜度", value: "少糖", price_add: 0 },
          ],
          remark: "",
        },
      ],
      item_count: 3,
      goods_amount: 52,
      discount_amount: 0,
      service_fee: 0,
      payable_amount: 52,
      paid_amount: 0,
      pay_status: "unpaid",
      order_status: "pending",
      kitchen_status: "waiting",
      source: "scan_table",
      created_at: now,
      paid_at: null,
      cancelled_at: null,
      completed_at: null,
      updated_at: now,
    },
    {
      _id: "order_test_002",
      order_no: "SO202606291002",
      store_id: "store_main_002",
      table_id: "table_b201",
      table_no: "B201",
      openid: "test_openid_002",
      user_nickname: "测试用户二",
      user_phone: "13900000002",
      order_type: "dine_in",
      people_count: 5,
      remark: "有老人，菜品尽量清淡",
      items: [
        {
          food_id: "food_test_001",
          food_name: "招牌牛肉面",
          image: "",
          category_id: "category_test_noodle",
          quantity: 2,
          unit_price: 24,
          total_price: 48,
          spec_key: "标准/不辣",
          specs: [
            { group_name: "份量", value: "标准", price_add: 0 },
            { group_name: "辣度", value: "不辣", price_add: 0 },
          ],
          remark: "",
        },
      ],
      item_count: 2,
      goods_amount: 48,
      discount_amount: 5,
      service_fee: 0,
      payable_amount: 43,
      paid_amount: 43,
      pay_status: "paid",
      order_status: "cooking",
      kitchen_status: "preparing",
      source: "scan_table",
      created_at: now,
      paid_at: now,
      cancelled_at: null,
      completed_at: null,
      updated_at: now,
    },
  ];

  const orderEvents = [
    {
      _id: "order_event_test_001",
      order_id: "order_test_001",
      event_type: "order_created",
      operator: {
        type: "user",
        openid: "test_openid_001",
      },
      payload: {
        from_status: null,
        to_status: "pending",
      },
      created_at: now,
    },
    {
      _id: "order_event_test_002",
      order_id: "order_test_002",
      event_type: "order_paid",
      operator: {
        type: "system",
        openid: "",
      },
      payload: {
        from_status: "unpaid",
        to_status: "paid",
      },
      created_at: now,
    },
  ];

  const details = {};
  const batchUpsert = async (collectionName, records) => {
    let success = 0;
    const errors = [];
    for (const record of records) {
      try {
        await upsertById(collectionName, record);
        success += 1;
      } catch (e) {
        errors.push({
          _id: record._id,
          message: e && e.message ? e.message : String(e),
        });
      }
    }
    details[collectionName] = {
      expected: records.length,
      success,
      failed: records.length - success,
      errors,
    };
  };

  await batchUpsert("stores", stores);
  await batchUpsert("dining_tables", diningTables);
  await batchUpsert("categories", categories);
  await batchUpsert("foods", foods);
  await batchUpsert("orders", orders);
  await batchUpsert("order_events", orderEvents);

  const hasFailures = Object.values(details).some((item) => item.failed > 0);

  return {
    success: !hasFailures,
    message: hasFailures
      ? "Seed finished with partial failures"
      : "Seed data inserted for 6 collections",
    inserted_counts: {
      stores: details.stores.success,
      dining_tables: details.dining_tables.success,
      categories: details.categories.success,
      foods: details.foods.success,
      orders: details.orders.success,
      order_events: details.order_events.success,
    },
    details,
  };
};

const buildOrderNo = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `SO${y}${m}${d}${h}${min}${s}${rand}`;
};

const createScanOrder = async (event) => {
  const data = event.data || {};
  const items = Array.isArray(data.items) ? data.items : [];
  if (!data.store_id || !data.table_id || !items.length) {
    return {
      success: false,
      message: "缺少必要参数（store_id/table_id/items）",
    };
  }

  const now = new Date().toISOString();
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  const currentUser = await getUserByOpenid(openid);
  if (!currentUser || !currentUser.phone_number) {
    return {
      success: false,
      message: "请先完成手机号授权登录",
    };
  }

  const normalizedItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.price || item.unit_price || 0);
    return {
      food_id: item.food_id || "",
      food_name: item.name || item.food_name || "",
      image: item.image || "",
      category_id: item.category_id || "",
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      total_price: Number((quantity * unitPrice).toFixed(2)),
      spec_key: item.specKey || item.spec_key || "",
      specs: item.specs || [],
      remark: item.remark || "",
    };
  });

  const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  const goodsAmount = normalizedItems.reduce((sum, item) => sum + item.total_price, 0);
  const payableAmount = Number(goodsAmount.toFixed(2));
  const orderNo = buildOrderNo();

  const orderDoc = {
    order_no: orderNo,
    store_id: data.store_id,
    store_name: data.store_name || "",
    table_id: data.table_id,
    table_no: data.table_no || "",
    openid,
    user_nickname: data.user_nickname || currentUser.nick_name || "微信用户",
    user_phone: currentUser.phone_number || "",
    order_type: "dine_in",
    people_count: Number(data.people_count || 1),
    remark: data.remark || "",
    items: normalizedItems,
    item_count: itemCount,
    goods_amount: payableAmount,
    discount_amount: 0,
    service_fee: 0,
    payable_amount: payableAmount,
    paid_amount: 0,
    pay_status: "unpaid",
    order_status: "pending",
    kitchen_status: "waiting",
    source: "scan_table",
    created_at: now,
    paid_at: null,
    cancelled_at: null,
    completed_at: null,
    updated_at: now,
  };

  const addRes = await db.collection("orders").add({
    data: orderDoc,
  });
  const orderId = addRes._id;

  await db
    .collection("dining_tables")
    .where({ _id: data.table_id })
    .update({
      data: {
        current_order_id: orderId,
        updated_at: now,
      },
    });

  await db.collection("order_events").add({
    data: {
      order_id: orderId,
      event_type: "order_created",
      operator: {
        type: "user",
        openid,
      },
      payload: {
        from_status: null,
        to_status: "pending",
      },
      created_at: now,
    },
  });

  return {
    success: true,
    message: "订单创建成功",
    data: {
      order_id: orderId,
      order_no: orderNo,
      payable_amount: payableAmount,
      item_count: itemCount,
    },
  };
};

const listScanOrders = async (event) => {
  const data = event.data || {};
  const pageNo = Math.max(1, Number(data.page_no || 1));
  const pageSize = Math.min(50, Math.max(1, Number(data.page_size || 20)));

  const where = {};
  if (data.store_id) where.store_id = data.store_id;
  if (data.table_id) where.table_id = data.table_id;
  if (data.order_status && data.order_status !== "all") {
    where.order_status = data.order_status;
  }
  if (data.pay_status && data.pay_status !== "all") {
    where.pay_status = data.pay_status;
  }

  const collection = db.collection("orders").where(where);
  const countRes = await collection.count();
  const total = countRes.total || 0;

  const listRes = await collection
    .orderBy("created_at", "desc")
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    success: true,
    data: {
      list: listRes.data || [],
      total,
      page_no: pageNo,
      page_size: pageSize,
    },
  };
};

const updateScanOrderStatus = async (event) => {
  const data = event.data || {};
  const orderId = data.order_id;
  const nextOrderStatus = data.next_order_status;
  const nextPayStatus = data.next_pay_status;

  if (!orderId) {
    return { success: false, message: "缺少 order_id" };
  }
  if (!nextOrderStatus && !nextPayStatus) {
    return { success: false, message: "缺少更新状态参数" };
  }

  const now = new Date().toISOString();
  const orderRes = await db.collection("orders").doc(orderId).get();
  const order = orderRes.data;
  if (!order) {
    return { success: false, message: "订单不存在" };
  }

  const updateData = { updated_at: now };
  if (nextOrderStatus) {
    updateData.order_status = nextOrderStatus;
    if (nextOrderStatus === "completed") updateData.completed_at = now;
    if (nextOrderStatus === "cancelled") updateData.cancelled_at = now;
  }
  if (nextPayStatus) {
    updateData.pay_status = nextPayStatus;
    if (nextPayStatus === "paid") {
      updateData.paid_at = now;
      updateData.paid_amount = Number(order.payable_amount || 0);
    }
  }

  await db.collection("orders").doc(orderId).update({
    data: updateData,
  });

  await db.collection("order_events").add({
    data: {
      order_id: orderId,
      event_type: "order_status_changed",
      operator: {
        type: "staff",
        openid: "",
      },
      payload: {
        from_order_status: order.order_status,
        to_order_status: nextOrderStatus || order.order_status,
        from_pay_status: order.pay_status,
        to_pay_status: nextPayStatus || order.pay_status,
      },
      created_at: now,
    },
  });

  if (nextOrderStatus === "completed" || nextOrderStatus === "cancelled") {
    await db
      .collection("dining_tables")
      .where({ _id: order.table_id, current_order_id: orderId })
      .update({
        data: {
          current_order_id: "",
          updated_at: now,
        },
      });
  }

  return {
    success: true,
    message: "订单状态更新成功",
  };
};

const listUserOrders = async (event) => {
  const data = event.data || {};
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  if (!openid) {
    return { success: false, message: "未获取到用户身份" };
  }
  const currentUser = await getUserByOpenid(openid);
  if (!currentUser || !currentUser.phone_number) {
    return { success: false, message: "请先完成手机号授权登录" };
  }

  const pageNo = Math.max(1, Number(data.page_no || 1));
  const pageSize = Math.min(50, Math.max(1, Number(data.page_size || 20)));
  const where = { openid };

  if (data.store_id) where.store_id = data.store_id;
  if (data.status_filter === "ongoing") {
    where.order_status = _.in(["pending", "cooking"]);
  } else if (data.status_filter === "completed") {
    where.order_status = "completed";
  } else if (data.status_filter === "cancelled") {
    where.order_status = "cancelled";
  }

  const collection = db.collection("orders").where(where);
  const countRes = await collection.count();
  const total = countRes.total || 0;
  const listRes = await collection
    .orderBy("created_at", "desc")
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    success: true,
    data: {
      list: listRes.data || [],
      total,
      page_no: pageNo,
      page_size: pageSize,
    },
  };
};

const userOrderAction = async (event) => {
  const data = event.data || {};
  const orderId = data.order_id;
  const action = data.action;
  if (!orderId || !action) {
    return { success: false, message: "缺少参数" };
  }

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  const currentUser = await getUserByOpenid(openid);
  if (!currentUser || !currentUser.phone_number) {
    return { success: false, message: "请先完成手机号授权登录" };
  }
  const orderRes = await db.collection("orders").doc(orderId).get();
  const order = orderRes.data;
  if (!order) return { success: false, message: "订单不存在" };
  if (order.openid !== openid) {
    return { success: false, message: "无权限操作该订单" };
  }

  const now = new Date().toISOString();
  const updateData = { updated_at: now };
  let eventType = "";

  if (action === "cancel") {
    if (order.order_status !== "pending") {
      return { success: false, message: "仅待接单订单可取消" };
    }
    updateData.order_status = "cancelled";
    updateData.cancelled_at = now;
    eventType = "order_cancelled_by_user";
  } else if (action === "pay") {
    if (order.pay_status === "paid") {
      return { success: false, message: "订单已支付" };
    }
    updateData.pay_status = "paid";
    updateData.paid_amount = Number(order.payable_amount || 0);
    updateData.paid_at = now;
    eventType = "order_paid_by_user";
  } else {
    return { success: false, message: "不支持的操作" };
  }

  await db.collection("orders").doc(orderId).update({
    data: updateData,
  });

  await db.collection("order_events").add({
    data: {
      order_id: orderId,
      event_type: eventType,
      operator: {
        type: "user",
        openid,
      },
      payload: {
        action,
      },
      created_at: now,
    },
  });

  if (action === "cancel") {
    await db
      .collection("dining_tables")
      .where({ _id: order.table_id, current_order_id: orderId })
      .update({
        data: {
          current_order_id: "",
          updated_at: now,
        },
      });
  }

  return {
    success: true,
    message: "操作成功",
  };
};

const getUserOrderDetail = async (event) => {
  const data = event.data || {};
  const orderId = data.order_id;
  if (!orderId) {
    return { success: false, message: "缺少 order_id" };
  }

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  const currentUser = await getUserByOpenid(openid);
  if (!currentUser || !currentUser.phone_number) {
    return { success: false, message: "请先完成手机号授权登录" };
  }

  const orderRes = await db.collection("orders").doc(orderId).get();
  const order = orderRes.data;
  if (!order) return { success: false, message: "订单不存在" };
  if (order.openid !== openid) {
    return { success: false, message: "无权限查看该订单" };
  }

  return {
    success: true,
    data: order,
  };
};

const loginUserWithPhone = async (event) => {
  const data = event.data || {};
  const now = new Date().toISOString();
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  if (!openid) {
    return {
      success: false,
      message: "登录失败，未获取到 openid",
    };
  }
  if (!data.phone_code) {
    return {
      success: false,
      message: "缺少手机号授权 code",
    };
  }

  const profile = data.profile || {};
  await ensureCollections(["users"]);

  let phoneInfo = null;
  try {
    const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({
      code: data.phone_code,
    });
    phoneInfo = phoneRes.phoneInfo || null;
  } catch (e) {
    return {
      success: false,
      message: "手机号授权失败，请重试",
      error: e && e.message ? e.message : String(e),
    };
  }
  if (!phoneInfo || !phoneInfo.phoneNumber) {
    return {
      success: false,
      message: "未获取到手机号",
    };
  }

  let createdAt = now;
  try {
    const existing = await db.collection("users").doc(openid).get();
    if (existing && existing.data && existing.data.created_at) {
      createdAt = existing.data.created_at;
    }
  } catch (e) {
    // 首次登录时 users 里不存在该用户，忽略
  }

  const loginDoc = {
    _id: openid,
    openid,
    appid: wxContext.APPID || "",
    unionid: wxContext.UNIONID || "",
    nick_name: profile.nickName || "",
    avatar_url: profile.avatarUrl || "",
    gender: Number(profile.gender || 0),
    city: profile.city || "",
    province: profile.province || "",
    country: profile.country || "",
    language: profile.language || "",
    phone_number: phoneInfo.phoneNumber || "",
    pure_phone_number: phoneInfo.purePhoneNumber || "",
    country_code: phoneInfo.countryCode || "",
    phone_number_verified: true,
    created_at: createdAt,
    updated_at: now,
  };

  await upsertById("users", loginDoc);
  return {
    success: true,
    data: loginDoc,
  };
};

const getLoginUser = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  if (!openid) {
    return {
      success: false,
      message: "未获取到 openid",
    };
  }

  try {
    const userRes = await db.collection("users").doc(openid).get();
    return {
      success: true,
      data: userRes.data || null,
    };
  } catch (e) {
    return {
      success: true,
      data: null,
    };
  }
};

const devMockLogin = async () => {
  const now = new Date().toISOString();
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || "";
  if (!openid) {
    return {
      success: false,
      message: "未获取到 openid",
    };
  }

  await ensureCollections(["users"]);
  const existing = await getUserByOpenid(openid);
  const loginDoc = {
    _id: openid,
    openid,
    appid: wxContext.APPID || "",
    unionid: wxContext.UNIONID || "",
    nick_name: (existing && existing.nick_name) || "测试用户",
    avatar_url: (existing && existing.avatar_url) || "",
    gender: (existing && existing.gender) || 0,
    city: (existing && existing.city) || "",
    province: (existing && existing.province) || "",
    country: (existing && existing.country) || "",
    language: (existing && existing.language) || "",
    phone_number: (existing && existing.phone_number) || "13800000000",
    pure_phone_number: (existing && existing.pure_phone_number) || "13800000000",
    country_code: (existing && existing.country_code) || "86",
    phone_number_verified: true,
    created_at: (existing && existing.created_at) || now,
    updated_at: now,
    is_mock_login: true,
  };

  await upsertById("users", loginDoc);
  return {
    success: true,
    data: loginDoc,
    message: "已写入测试登录信息",
  };
};
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

const getBannerImg = async () => {
  const root = "cloud://cloud1-d7gt62ex18961a7ea.636c-cloud1-d7gt62ex18961a7ea-1442037819";
  const candidateGroups = [
    [`${root}/banner1.png`, `${root}/images/banner1.png`],
    [`${root}/banner2.png`, `${root}/images/banner2.png`],
    [`${root}/banner3.png`, `${root}/images/banner3.png`],
  ];

  const fileList = candidateGroups.flat();
  const tempRes = await cloud.getTempFileURL({ fileList });
  const urlMap = {};
  (tempRes.fileList || []).forEach((item) => {
    if (item.status === 0 && item.tempFileURL) {
      urlMap[item.fileID] = item.tempFileURL;
    }
  });

  const banners = candidateGroups
    .map((group) => {
      const hitFileId = group.find((id) => !!urlMap[id]);
      return hitFileId ? urlMap[hitFileId] : "";
    })
    .filter(Boolean);

  return {
    success: banners.length > 0,
    data: banners,
    message: banners.length > 0 ? "ok" : "未找到可用轮播图文件",
  };
};

const updateFoodStatus = async (event) => {
  const data = event.data || {};
  const foodId = data.food_id;
  const status = Number(data.status);

  if (!foodId) {
    return { success: false, message: "缺少 food_id" };
  }
  if (![0, 1].includes(status)) {
    return { success: false, message: "status 仅支持 0 或 1" };
  }

  const now = new Date().toISOString();
  const foodRes = await db.collection("foods").doc(foodId).get();
  if (!foodRes.data) {
    return { success: false, message: "商品不存在" };
  }

  await db.collection("foods").doc(foodId).update({
    data: {
      status,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: status === 1 ? "商品已上架" : "商品已下架",
  };
};

function normalizeFoodPayload(data = {}) {
  const price = Number(data.price);
  const sort = Number(data.sort);
  return {
    store_id: data.store_id || "",
    category_id: data.category_id || "",
    name: String(data.name || "").trim(),
    image: String(data.image || "").trim(),
    description: String(data.description || "").trim(),
    price: Number.isNaN(price) ? 0 : Number(price.toFixed(2)),
    sort: Number.isInteger(sort) && sort > 0 ? sort : 1,
    status: [0, 1].includes(Number(data.status)) ? Number(data.status) : 1,
    hasSpec: !!data.hasSpec,
    spec_groups: Array.isArray(data.spec_groups) ? data.spec_groups : [],
  };
}

const createFood = async (event) => {
  const payload = normalizeFoodPayload(event.data || {});
  if (!payload.store_id) return { success: false, message: "缺少 store_id" };
  if (!payload.category_id) return { success: false, message: "请选择分类" };
  if (!payload.name) return { success: false, message: "请输入商品名称" };
  if (payload.price < 0) return { success: false, message: "价格不能小于 0" };

  const now = new Date().toISOString();
  const addRes = await db.collection("foods").add({
    data: {
      ...payload,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message: "商品新增成功",
    data: { food_id: addRes._id },
  };
};

const updateFood = async (event) => {
  const data = event.data || {};
  const foodId = data.food_id;
  if (!foodId) return { success: false, message: "缺少 food_id" };

  const payload = normalizeFoodPayload(data);
  if (!payload.store_id) return { success: false, message: "缺少 store_id" };
  if (!payload.category_id) return { success: false, message: "请选择分类" };
  if (!payload.name) return { success: false, message: "请输入商品名称" };
  if (payload.price < 0) return { success: false, message: "价格不能小于 0" };

  const foodRes = await db.collection("foods").doc(foodId).get();
  if (!foodRes.data) return { success: false, message: "商品不存在" };

  const now = new Date().toISOString();
  await db.collection("foods").doc(foodId).update({
    data: {
      ...payload,
      updated_at: now,
    },
  });

  return { success: true, message: "商品更新成功" };
};

const deleteFood = async (event) => {
  const foodId = (event.data || {}).food_id;
  if (!foodId) return { success: false, message: "缺少 food_id" };

  const foodRes = await db.collection("foods").doc(foodId).get();
  if (!foodRes.data) return { success: false, message: "商品不存在" };

  await db.collection("foods").doc(foodId).remove();
  return { success: true, message: "商品已删除" };
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');
// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "seedScanOrderTestData":
      return await seedScanOrderTestData();
    case "createScanOrder":
      return await createScanOrder(event);
    case "listScanOrders":
      return await listScanOrders(event);
    case "updateScanOrderStatus":
      return await updateScanOrderStatus(event);
    case "listUserOrders":
      return await listUserOrders(event);
    case "userOrderAction":
      return await userOrderAction(event);
    case "getUserOrderDetail":
      return await getUserOrderDetail(event);
    case "loginUserWithPhone":
      return await loginUserWithPhone(event);
    case "getLoginUser":
      return await getLoginUser();
    case "devMockLogin":
      return await devMockLogin();
    case "getBannerImg":
      return await getBannerImg();
    case "updateFoodStatus":
      return await updateFoodStatus(event);
    case "createFood":
      return await createFood(event);
    case "updateFood":
      return await updateFood(event);
    case "deleteFood":
      return await deleteFood(event);
  }
};
