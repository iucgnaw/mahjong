var m_crypto = require("../utils/crypto");
var m_express = require("express");
var m_db = require("../utils/db");
var m_http = require("../utils/http");
var m_fibers = require("fibers");

var g_arrayAppInfo = {
	Android: {
		appid: "wxe39f08522d35c80c",
		secret: "fa88e3a3ca5a11b06499902cea4b9c01",
	},
	iOS: {
		appid: "wxcb508816c5c4e2a4",
		secret: "7de38489ede63089269e3410d5905038",
	}
};

var g_express_account_server = m_express();
var g_config = null;
var g_urlHall = "";

exports.start = function (a_config) {
	g_config = a_config;
	g_urlHall = g_config.HALL_IP + ":" + g_config.HALL_CLIENT_PORT;
	g_express_account_server.listen(g_config.CLIENT_PORT);
	console.log("account server is listening on " + g_config.CLIENT_PORT);
}

//设置跨域访问
g_express_account_server.all("*", function (a_request, a_response, a_fnNext) {
	a_response.header("Access-Control-Allow-Origin", "*");
	a_response.header("Access-Control-Allow-Headers", "X-Requested-With");
	a_response.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	a_response.header("X-Powered-By", " 3.2.1")
	a_response.header("Content-Type", "application/json;charset=utf-8");
	m_fibers(function () {
		a_fnNext();
	}).run();
});

// Not used
g_express_account_server.get("/get_server_version", function (a_request, a_response) {
	var version = {
		version: g_config.VERSION,
	}
	a_response.send(JSON.stringify(version))
});

g_express_account_server.get("/get_server_info", function (a_request, a_response) {
	var serverInfo = {
		version: g_config.VERSION,
		urlHall: g_urlHall,
		appweb: g_config.APP_WEB,
	}
	a_response.send(JSON.stringify(serverInfo))
});

// Not used
g_express_account_server.get("/register_account", function (a_request, a_response) {
	var account = a_request.query.account;
	var password = a_request.query.password;

	var fnFail = function () {
		var ret = {
			errcode: 1,
			errmsg: "Account has been used."
		};
		a_response.send(JSON.stringify(ret))
	};

	var fnSucceed = function () {
		var ret = {
			errcode: 0,
			errmsg: "Ok."
		};
		a_response.send(JSON.stringify(ret))
	};

	// If user exists, then create account accordingly
	m_db.is_user_exist(account, function (a_exist) {
		if (a_exist) {
			m_db.create_account(account, password, function (a_ret) {
				if (a_ret) {
					fnSucceed();
				} else {
					fnFail();
				}
			});
		} else {
			fnFail();
		}
	});
});

g_express_account_server.get("/register_guest", function (a_request, a_response) {
	var account = "guest_" + a_request.query.account;
	var sign = m_crypto.md5(account + a_request.ip + g_config.ACCOUNT_PRI_KEY);
	var ret = {
		errcode: 0,
		errmsg: "Ok.",
		account: account,
		urlHall: g_urlHall,
		sign: sign
	}
	a_response.send(JSON.stringify(ret))
});

// Not used
g_express_account_server.get("/auth", function (a_request, a_response) {
	var account = a_request.query.account;
	var password = a_request.query.password;

	m_db.get_account_info(account, password, function (a_info) {
		if (a_info == null) {
			var ret = {
				errcode: 1,
				errmsg: "Invalid account."
			};
			a_response.send(JSON.stringify(ret))
			return;
		}

		var account = "vivi_" + a_request.query.account;
		var sign = get_md5(account + a_request.ip + g_config.ACCOUNT_PRI_KEY);
		var ret = {
			errcode: 0,
			errmsg: "Ok.",
			account: account,
			sign: sign
		}
		a_response.send(JSON.stringify(ret))
	});
});

function get_access_token(a_code, a_Os, a_fnCallback) {
	var appInfo = g_arrayAppInfo[a_Os];
	if (appInfo == null) {
		a_fnCallback(false, null);
	}

	var data = {
		appid: appInfo.appid,
		secret: appInfo.secret,
		code: a_code,
		grant_type: "authorization_code"
	};

	m_http.get2("https://api.weixin.qq.com/sns/oauth2/access_token", data, a_fnCallback, true);
}

function get_state_info(a_accessToken, a_openId, a_fnCallback) {
	var data = {
		access_token: a_accessToken,
		openid: a_openId
	};

	m_http.get2("https://api.weixin.qq.com/sns/userinfo", data, a_fnCallback, true);
}

function create_user(a_account, a_name, a_sex, a_urlImage, a_fnCallback) {
	var coins = 1000;
	var gems = 1021;

	m_db.is_user_exist(a_account, function (a_exist) {
		if (!a_exist) {
			m_db.create_user(a_account, a_name, coins, gems, a_sex, a_urlImage, function (a_ignore) {
				a_fnCallback();
			});
		} else {
			m_db.update_user_info(a_account, a_name, a_urlImage, a_sex, function (a_ignore) {
				a_fnCallback();
			});
		}
	});
};

g_express_account_server.get("/wechat_auth", function (a_request, a_response) {
	var code = a_request.query.code;
	var os = a_request.query.os;
	if (code == null || code == "" || os == null || os == "") {
		return;
	}

	get_access_token(code, os, function (a_getAccessTokenSuccess, a_accessToken_openId) {
		if (a_getAccessTokenSuccess) {
			var access_token = a_accessToken_openId.access_token;
			var openid = a_accessToken_openId.openid;
			get_state_info(access_token, openid, function (a_getStateInfoSuccess, a_stateInfo) {
				if (a_getStateInfoSuccess) {
					var account = "wx_" + a_stateInfo.openid;
					var name = a_stateInfo.nickname;
					var sex = a_stateInfo.sex;
					var urlImage = a_stateInfo.headimgurl;
					create_user(account, name, sex, urlImage, function () {
						var sign = m_crypto.md5(account + a_request.ip + g_config.ACCOUNT_PRI_KEY);
						var ret = {
							errcode: 0,
							errmsg: "Ok.",
							account: account,
							urlHall: g_urlHall,
							sign: sign
						};
						a_response.send(JSON.stringify(ret))
					});
				}
			});
		} else {
			var ret = {
				errcode: -1,
				errmsg: "Unkown error."
			};
			a_response.send(JSON.stringify(ret))
		}
	});
});

g_express_account_server.get("/profile", function (a_request, a_response) {
	var userId = a_request.query.userId;
	m_db.get_user_profile(userId, function (a_profile) {
		var ret = {
			errcode: 0,
			errmsg: "Ok.",
			name: a_profile.name,
			sex: a_profile.sex,
			urlImage: a_profile.headimg
		};
		a_response.send(JSON.stringify(ret))
	});
});

g_express_account_server.get("/image", function (a_request, a_response) {
	var url = a_request.query.url;
	if (!url) {
		m_http.send(a_response, 1, "Null URL.", {});
		return;
	}
	if (url.search("http://") != 0 && url.search("https://") != 0) {
		m_http.send(a_response, 1, "URL not begin with http:// or https://.", {});
		return;
	}

	url = url.split(".jpg")[0];

	var isHttps = url.search("https://") == 0;
	var ret = m_http.getSync(url, null, isHttps, "binary");
	if (!ret.type || !ret.data) {
		m_http.send(a_response, 1, "HTTP sync failed.", true);
		return;
	}
	a_response.writeHead(200, {
		"Content-Type": ret.type
	});
	a_response.write(ret.data, "binary");
	a_response.end();
});