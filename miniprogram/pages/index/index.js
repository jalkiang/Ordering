// pages/index/index.js
const db = wx.cloud.database();
const MAX_QUERY_LIMIT = 200;

Page({
  data: {
    showSpecModal: false,       // 规格弹窗显隐
    currentSpecFood: null,      // 当前操作的规格商品原始对象
    chosenSpecIndexes: [],      // 选中的规格索引，如 [0, 1, 0]
    currentSpecPrice: 0,        // 动态叠加后的单价
    currentSpecString: '',      // 组合明细字串
    currentSpecQuantity: 0,     // 当前组合在购物车已有的数量

    showCartPopup: false, // 控制弹窗显隐
    stores: [],
    currentStoreId: "",
    currentStoreName: "",
    currentTableId: "",
    currentTableNo: "",
    currentCategory: '',
    categories: [],
    cart: [],
    cartList: [],
    totalPrice: 0,
    totalCount: 0
  },

  async onLoad(options) {
    await this.initPageContext(options || {});
  },

  async initPageContext(options) {
    try {
      await this.fetchStoreList();
      const tableIdFromScene = this.parseTableIdFromScene(options.scene);
      const tableIdFromOption = options.table_id || options.tableId || "";
      const targetTableId = tableIdFromScene || tableIdFromOption;

      if (targetTableId) {
        await this.bindTableAndLoadMenu(targetTableId);
        return;
      }

      if (this.data.currentStoreId) {
        await this.fetchMenuData(this.data.currentStoreId);
      }
    } catch (e) {
      console.error("初始化页面失败：", e);
      wx.showToast({
        title: "初始化失败，请重试",
        icon: "none",
      });
    }
  },

  async fetchStoreList() {
    const res = await db
      .collection("stores")
      .where({ status: 1 })
      .limit(MAX_QUERY_LIMIT)
      .get();

    const stores = res.data || [];
    const firstStore = stores[0] || {};
    this.setData({
      stores,
      currentStoreId: this.data.currentStoreId || firstStore._id || "",
      currentStoreName: this.data.currentStoreName || firstStore.name || "",
    });
  },

  parseTableIdFromScene(scene) {
    if (!scene) return "";
    let decodedScene = "";
    try {
      decodedScene = decodeURIComponent(scene);
    } catch (e) {
      decodedScene = scene;
    }
    return this.extractTableId(decodedScene);
  },

  extractTableId(rawResult = "") {
    const raw = String(rawResult || "").trim();
    if (!raw) return "";

    const queryIndex = raw.indexOf("?");
    const queryString = queryIndex >= 0 ? raw.slice(queryIndex + 1) : raw;
    const queryMatch = queryString.match(/(?:^|&)table_id=([^&]+)/);
    if (queryMatch && queryMatch[1]) {
      return decodeURIComponent(queryMatch[1]);
    }

    if (/^table_[\w-]+$/i.test(raw)) {
      return raw;
    }

    return "";
  },

  async onScanTableTap() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
      success: async (res) => {
        try {
          const tableId = this.extractTableId(res.result);
          if (!tableId) {
            wx.showToast({
              title: "二维码格式不正确",
              icon: "none",
            });
            return;
          }
          await this.bindTableAndLoadMenu(tableId);
        } catch (e) {
          console.error("扫码绑定桌台失败：", e);
          wx.showToast({
            title: "扫码失败，请重试",
            icon: "none",
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: "已取消扫码",
          icon: "none",
        });
      },
    });
  },

  async onChooseStoreTap() {
    const stores = this.data.stores || [];
    if (!stores.length) {
      wx.showToast({
        title: "暂无可选门店",
        icon: "none",
      });
      return;
    }

    wx.showActionSheet({
      itemList: stores.map((store) => store.name),
      success: async (res) => {
        const selectedStore = stores[res.tapIndex];
        if (!selectedStore || selectedStore._id === this.data.currentStoreId) return;

        const canSwitch = await this.confirmContextSwitch(
          "切换门店会清空当前购物车，是否继续？"
        );
        if (!canSwitch) return;

        this.resetCartState();
        this.setData({
          currentStoreId: selectedStore._id,
          currentStoreName: selectedStore.name,
          currentTableId: "",
          currentTableNo: "",
        });

        await this.fetchMenuData(selectedStore._id);
      },
    });
  },

  confirmContextSwitch(content) {
    if (this.data.totalCount <= 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      wx.showModal({
        title: "提示",
        content,
        success: (res) => resolve(!!res.confirm),
        fail: () => resolve(false),
      });
    });
  },

  resetCartState() {
    this.setData({
      showCartPopup: false,
      showSpecModal: false,
      currentSpecFood: null,
      chosenSpecIndexes: [],
      currentSpecPrice: 0,
      currentSpecString: "",
      currentSpecQuantity: 0,
      cart: [],
      cartList: [],
      totalPrice: 0,
      totalCount: 0,
    });
  },

  async bindTableAndLoadMenu(tableId) {
    let table = null;
    try {
      const tableRes = await db.collection("dining_tables").doc(tableId).get();
      table = tableRes.data;
    } catch (e) {
      const queryRes = await db
        .collection("dining_tables")
        .where({ qr_scene: `table_id=${tableId}` })
        .limit(1)
        .get();
      table = queryRes.data && queryRes.data[0];
    }

    if (!table || !table.store_id) {
      wx.showToast({
        title: "未找到桌台信息",
        icon: "none",
      });
      return;
    }

    const canSwitch = await this.confirmContextSwitch(
      "切换桌台会清空当前购物车，是否继续？"
    );
    if (!canSwitch) return;

    const matchedStore =
      (this.data.stores || []).find((item) => item._id === table.store_id) || {};

    this.resetCartState();
    this.setData({
      currentStoreId: table.store_id,
      currentStoreName: matchedStore.name || this.data.currentStoreName || "",
      currentTableId: table._id,
      currentTableNo: table.table_no || table.table_name || "",
    });

    await this.fetchMenuData(table.store_id);
    wx.showToast({
      title: `已绑定${table.table_no || "桌台"}`,
      icon: "none",
    });
  },

  // 1. 【触发】打开规格弹窗
openSpecModal(e) {
  const { catIndex, foodIndex } = e.currentTarget.dataset;
  const food = this.data.categories[catIndex].foods[foodIndex];
  
  // 默认每一组都选中第一个规格（索引 0）
  let defaultIndexes = (food.spec_groups || []).map(() => 0);

  this.setData({
    showSpecModal: true,
    currentSpecFood: { ...food, catIndex, foodIndex },
    chosenSpecIndexes: defaultIndexes
  });

  // 触发实时价格与购入数量盘点
  this.innerCalculateSpec();
},

// 2. 【切换】点击切换不同的规格标签
selectSpecTag(e) {
  const { groupIndex, tagIndex } = e.currentTarget.dataset;
  let chosenSpecIndexes = this.data.chosenSpecIndexes;
  
  // 更新该组选中的索引
  chosenSpecIndexes[groupIndex] = tagIndex;
  
  this.setData({ chosenSpecIndexes });
  this.innerCalculateSpec(); // 重新计价与盘点
},


// 【关闭】关闭规格弹窗
closeSpecModal() {
  this.setData({ showSpecModal: false });
},

// 1. 【核心优化】选完规格，一键加入购物车
addCurrentSpecToCart() {
  if (!this.data.currentSpecFood) return;

  const { catIndex, foodIndex } = this.data.currentSpecFood;
  const specKey = this.data.currentSpecString; // 例如: "大杯/去冰"

  let categories = this.data.categories;
  let targetFood = categories[catIndex].foods[foodIndex];

  // 初始化多规格存储器
  if (!targetFood.skus) targetFood.skus = {};

  // 该规格数量 +1
  targetFood.skus[specKey] = (targetFood.skus[specKey] || 0) + 1;

  // 强制写入 data，关闭弹窗，并立即触发大统计
  this.setData({
    categories: categories,
    showSpecModal: false
  }, () => {
    // 💡 核心：立刻调用统计算法，刷新底部购物车
    this.calculateCart(this.data.categories);
    
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 800
    });
  });
},

// 2. 【核心优化】精确计价算法（无符号拆分，纯粹安全版）
innerCalculateSpec() {
  const food = this.data.currentSpecFood;
  const indexes = this.data.chosenSpecIndexes;
  if (!food) return;

  let finalPrice = food.price; // 基础起步价
  let specNames = [];

  // 遍历选中的规格，累加加价
  (food.spec_groups || []).forEach((group, gIndex) => {
    let selectedTagIndex = indexes[gIndex];
    // 累加加价
    let addPrice = (group.price_adds && group.price_adds[selectedTagIndex]) || 0;
    finalPrice += addPrice;
    
    // 直接推入原始文本，不做任何危险的 split 拆分
    specNames.push(group.list[selectedTagIndex]);
  });

  const specKey = specNames.join('/'); // 组装唯一 SKU 钥匙
  
  // 盘点这个 SKU 之前在购物车里有几份
  let currentSpecQuantity = (food.skus && food.skus[specKey]) || 0;

  this.setData({
    currentSpecPrice: Number(finalPrice.toFixed(2)),
    currentSpecString: specKey,
    currentSpecQuantity: currentSpecQuantity
  });
},

calculateCart(categories) {
  console.log("=== ⏬ 顺藤摸瓜：calculateCart 开始大盘点 ===");
  let tempCartList = [];
  let totalPrice = 0;
  let totalCount = 0;

  if (!categories || !Array.isArray(categories)) {
    console.error("❌ 错误：传给 calculateCart 的 categories 不是一个有效数组！");
    return;
  }

  categories.forEach((category, catIndex) => {
    if (!category.foods) return;
    
    category.foods.forEach((food, foodIndex) => {
      
      // 🌟 核心分流一：只要这个商品有规格选购数据
      if (food.skus && Object.keys(food.skus).length > 0) {
        let thisFoodTotalCount = 0;
        
        Object.keys(food.skus).forEach(specKey => {
          let qty = food.skus[specKey];
          if (qty > 0) {
            let specPrice = food.price || 0;
            
            // 💡 【防崩溃安全锁】：自动兼容 spec_groups / specs / spec_list 各种命名
            let specGroups = food.spec_groups || food.specs || food.spec_list;
            
            if (specGroups && Array.isArray(specGroups)) {
              let specTags = specKey.split('/');
              specGroups.forEach((group, gIndex) => {
                let currentTagName = specTags[gIndex];
                if (group.list) {
                  let matchIndex = group.list.indexOf(currentTagName);
                  if (matchIndex !== -1 && group.price_adds) {
                    specPrice += (group.price_adds[matchIndex] || 0);
                  }
                }
              });
            } else {
              // 如果控制台报了这行警告，说明你的云数据库字段名写错了！
              console.warn(`⚠️ 提示：商品 [${food.name}] 没找到匹配的规格数组，将按基础价计算。`);
            }

            // 装填扁平化购物车
            tempCartList.push({
              food_id: `${food._id}_${specKey}`,
              name: `${food.name} (${specKey})`,
              price: Number(specPrice.toFixed(2)),
              quantity: qty,
              catIndex: catIndex,
              foodIndex: foodIndex,
              isSpec: true,
              specKey: specKey
            });

            totalPrice += specPrice * qty;
            totalCount += qty;
            thisFoodTotalCount += qty;
          }
        });
        
        // 把当前商品所有规格的总数，回填给主页角标显示
        food.quantity = thisFoodTotalCount;
      } 
      
      //核心分流二：普通的无规格商品
      else if (!food.hasSpec && food.quantity > 0) {
        tempCartList.push({
          food_id: food._id,
          name: food.name,
          price: food.price || 0,
          quantity: food.quantity,
          catIndex: catIndex,
          foodIndex: foodIndex,
          isSpec: false
        });
        totalPrice += (food.price || 0) * food.quantity;
        totalCount += food.quantity;
      }
    });
  });

  // 统一响应式更新
  this.setData({
    categories: categories,
    cartList: tempCartList,
    totalPrice: Number(totalPrice.toFixed(2)),
    totalCount: totalCount
  });
},

  async fetchMenuData(storeId) {
    if (!storeId) {
      this.setData({
        categories: [],
        currentCategory: "",
      });
      return;
    }

    wx.showLoading({ title: '加载菜单中...' });
    try {
      const categoriesPromise = db
        .collection('categories')
        .where({ status: 1, store_id: storeId })
        .orderBy('sort', 'asc')
        .limit(MAX_QUERY_LIMIT)
        .get();
      const foodsPromise = db
        .collection('foods')
        .where({ status: 1, store_id: storeId })
        .limit(MAX_QUERY_LIMIT)
        .get();
      const [resCategories, resFoods] = await Promise.all([categoriesPromise, foodsPromise]);

      const categoryList = resCategories.data;
      const foodList = resFoods.data;

      const completeMenu = categoryList.map(category => {
        return {
          ...category,
          foods: foodList
            .filter(food => food.category_id === category._id)
            .map(f => ({
              ...f,
              hasSpec: !!f.hasSpec,
              quantity: 0,
              skus: {},
            }))
        };
      });

      this.setData({
        categories: completeMenu,
        currentCategory: completeMenu[0] ? completeMenu[0]._id : ''
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error(err);
    }
  },

  // 💡 核心函数：统一管理加减逻辑
  updateCartQuantity(catIndex, foodIndex, isAdd) {
    let categories = this.data.categories;
    let food = categories[catIndex].foods[foodIndex];

    // 1. 修改当前点击菜品的数量
    if (isAdd) {
      food.quantity = (food.quantity || 0) + 1;
    } else {
      if (food.quantity > 0) {
        food.quantity -= 1;
      }
    }

    // 2. 重新扫描所有菜品，计算最新的：购物车数组、总价、总件数
    let newCart = [];
    let newTotalPrice = 0;
    let newTotalCount = 0;

    categories.forEach(cat => {
      cat.foods.forEach(f => {
        if (f.quantity > 0) {
          newCart.push({
            food_id: f._id,
            name: f.name,
            price: f.price,
            quantity: f.quantity
          });
          newTotalPrice += f.price * f.quantity;
          newTotalCount += f.quantity;
        }
      });
    });

    // 3. 一键更新页面变量
    this.setData({
      categories: categories,
      cart: newCart,
      totalPrice: Number(newTotalPrice.toFixed(2)),
      totalCount: newTotalCount
    });
  },

  switchCategory(e) {
    this.setData({ currentCategory: e.currentTarget.dataset.id });
  },

  submitOrder() {
    if (this.data.totalCount <= 0) {
      wx.showToast({
        title: "购物车为空",
        icon: "none",
      });
      return;
    }
    //测试暂时隐藏
/*     else if(!this.data.currentStoreId || !this.data.currentTableId){
      wx.showModal({
        title:'提示',
        content:'桌号为空，请先扫描桌上二维码',
        success: (res) => {
          if (res.confirm) {
            this.onScanTableTap();
          } else if (res.cancel) {
            console.log('用户点击取消');
            // 用户点击取消后的逻辑处理
          }
        }
      })
    } */
    else{
      wx.setStorageSync('checkout_cart', this.data.cartList);
      wx.setStorageSync('checkout_price', this.data.totalPrice);
      wx.setStorageSync('checkout_context', {
        store_id: this.data.currentStoreId,
        store_name: this.data.currentStoreName,
        table_id: this.data.currentTableId,
        table_no: this.data.currentTableNo,
        total_count: this.data.totalCount,
      });
      wx.navigateTo({ url: '/pages/settlement/settlement' });
    }

  },
  // 1. 点击购物车图标/信息区，切换弹窗
  toggleCartPopup() {
    if (this.data.totalCount === 0) {
      this.setData({ showCartPopup: false });
      return;
    }
    this.setData({
      showCartPopup: !this.data.showCartPopup
    });
  },



//主页加号和弹窗加号共同绑定这一个函数
onAdd(e) {
  const { catIndex, foodIndex } = e.currentTarget.dataset;
  
  let categories = this.data.categories;
  let currentFood = categories[catIndex].foods[foodIndex];
  
  // 数量自增
  currentFood.quantity = (currentFood.quantity || 0) + 1;
  
  // 必须调用统计，才能把数据同步到购物车列表（cartList）里
  this.calculateCart(categories);
},

// 2. 主页减号和弹窗减号共同绑定这一个函数
onMinus(e) {
  console.log('👉 【验证】减号确实被点到了！');
  const { catIndex, foodIndex } = e.currentTarget.dataset;
  
  let categories = this.data.categories;
  let currentFood = categories[catIndex].foods[foodIndex];
  
  if (currentFood.quantity && currentFood.quantity > 0) {
    currentFood.quantity -= 1;
    
    // 每次减少数量，也必须重新统计购物车
    this.calculateCart(categories);
  }
},

// 1. 🎯 购物车列表点击减号（精准剔除多规格）
onCartMinus(e) {
  const { catIndex, foodIndex, isSpec, specKey } = e.currentTarget.dataset;
  let categories = this.data.categories;
  let targetFood = categories[catIndex].foods[foodIndex];

  if (isSpec) {
    // 🔥 核心修复：如果是规格商品，去扣减对应的 sku 数量
    if (targetFood.skus && targetFood.skus[specKey] > 0) {
      targetFood.skus[specKey]--;
      
      // 💡 关键细节：如果该规格的数量降到 0 了，直接把这个 key 从对象里“连根拔起”删掉
      if (targetFood.skus[specKey] === 0) {
        delete targetFood.skus[specKey];
      }
    }
  } else {
    // 普通无规格商品
    if (targetFood.quantity > 0) {
      targetFood.quantity--;
    }
  }

  // 强制数据落地，并让大总管函数重新盘点
  this.setData({ categories }, () => {
    this.calculateCart(this.data.categories);
  });
},

// 2. 彻底清空购物车
clearCart() {
  wx.showModal({
    title: '提示',
    content: '确定要清空购物车吗？',
    success: (res) => {
      if (res.confirm) {
        let categories = this.data.categories;

        // 核心修复：开展地毯式大扫除，把所有商品的普通数量和 skus 容器全部彻底洗白
        categories.forEach(category => {
          if (category.foods) {
            category.foods.forEach(food => {
              food.quantity = 0; // 擦干主页无规格商品的数量和小红点
              food.skus = {};    // 💥 关键：把多规格的存储箱直接砸碎置空！
            });
          }
        });

        // 强刷大盘，并顺便关掉购物车弹窗提高体验
        this.setData({ 
          categories: categories,
          showCartPopup: false // 清空后自动收起购物车弹窗
        }, () => {
          // 重新大盘点（此时算出来的数据绝对全为 0）
          this.calculateCart(this.data.categories);
          
          wx.showToast({
            title: '购物车已清空',
            icon: 'success'
          });
        });
      }
    }
  });
},

// 3. 🎯 【可选补丁】如果你在购物车列表里也想点加号直接增加规格数量
onCartAdd(e) {
  const { catIndex, foodIndex, isSpec, specKey } = e.currentTarget.dataset;
  let categories = this.data.categories;
  let targetFood = categories[catIndex].foods[foodIndex];

  if (isSpec) {
    if (!targetFood.skus) targetFood.skus = {};
    targetFood.skus[specKey] = (targetFood.skus[specKey] || 0) + 1;
  } else {
    targetFood.quantity = (targetFood.quantity || 0) + 1;
  }

  this.setData({ categories }, () => {
    this.calculateCart(this.data.categories);
  });
},
  
  handlePay() {
    this.submitOrder();
  }
})