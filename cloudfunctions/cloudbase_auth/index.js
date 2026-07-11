const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// 允许访问共享环境的商家端 AppID 白名单
const ALLOWED_APPIDS = ["wx59a1e889342a8020"];

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const fromAppid = wxContext.FROM_APPID || "";

  if (!ALLOWED_APPIDS.includes(fromAppid)) {
    return {
      errCode: -1,
      errMsg: `未授权的小程序: ${fromAppid}`,
    };
  }

  return {
    errCode: 0,
    errMsg: "",
    auth: JSON.stringify({
      appid: fromAppid,
    }),
  };
};
