var m_crypto = require("../utils/crypto");
var g_express = require("express");
var m_db = require("../utils/db");
var g_http = require("../utils/http");
var g_room_service = require("./room_service");

var g_app = g_express();
var g_config = null;

function check_account(req, res) {
	var account = req.query.account;
	var sign = req.query.sign;
	if (account == null || sign == null) {
		g_http.send(res, 1, "unknown error");
		return false;
	}
	/*
	var serverSign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
	if(serverSign != sign){
		http.send(res,2,"login failed.");
		return false;
	}
	*/
	return true;
}

//设置跨域访问
g_app.all("*", function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", " 3.2.1");
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

g_app.get("/login", function (req, res) {
	if (!check_account(req, res)) {
		return;
	}

	var ip = req.ip;
	if (ip.indexOf("::ffff:") != -1) {
		ip = ip.substr(7);
	}

	var account = req.query.account;
	m_db.get_user_data(account, function (data) {
		if (data == null) {
			g_http.send(res, 0, "ok");
			return;
		}

		var ret = {
			account: data.account,
			userId: data.userId,
			name: data.name,
			lv: data.lv,
			exp: data.exp,
			coins: data.coins,
			gems: data.gems,
			ip: ip,
			sex: data.sex,
		};

		m_db.get_room_id_of_user(data.userId, function (roomId) {
			//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
			if (roomId != null) {
				//检查房间是否存在于数据库中
				m_db.is_room_exist(roomId, function (retval) {
					if (retval) {
						ret.roomid = roomId;
					} else {
						//如果房间不在了，表示信息不同步，清除掉用户记录
						m_db.set_room_id_of_user(data.userId, null);
					}
					g_http.send(res, 0, "ok", ret);
				});
			} else {
				g_http.send(res, 0, "ok", ret);
			}
		});
	});
});

g_app.get("/create_user", function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var account = req.query.account;
	var name = req.query.name;
	var coins = 1000;
	var gems = 1021;
	console.log(name);

	m_db.is_user_exist(account, function (ret) {
		if (!ret) {
			m_db.create_user(account, name, coins, gems, 0, null, function (ret) {
				if (ret == null) {
					g_http.send(res, 2, "system error.");
				} else {
					g_http.send(res, 0, "ok");
				}
			});
		} else {
			g_http.send(res, 1, "account have already exist.");
		}
	});
});

g_app.get("/create_private_room", function (req, res) {
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	var conf = data.conf;
	m_db.get_user_data(account, function (data) {
		if (data == null) {
			g_http.send(res, 1, "system error");
			return;
		}
		var userId = data.userId;
		var name = data.name;
		//验证玩家状态
		m_db.get_room_id_of_user(userId, function (roomId) {
			if (roomId != null) {
				g_http.send(res, -1, "user is playing in room now.");
				return;
			}
			//创建房间
			g_room_service.createRoom(account, userId, conf, function (err, roomId) {
				if (err == 0 && roomId != null) {
					g_room_service.enterRoom(userId, name, roomId, function (errcode, enterInfo) {
						if (enterInfo) {
							var ret = {
								roomid: roomId,
								ip: enterInfo.ip,
								port: enterInfo.port,
								token: enterInfo.token,
								time: Date.now()
							};
							ret.sign = m_crypto.md5(ret.roomid + ret.token + ret.time + g_config.ROOM_PRI_KEY);
							g_http.send(res, 0, "ok", ret);
						} else {
							g_http.send(res, errcode, "room does not exist.");
						}
					});
				} else {
					g_http.send(res, err, "create failed.");
				}
			});
		});
	});
});

g_app.get("/enter_private_room", function (req, res) {
	var data = req.query;
	var roomId = data.roomid;
	if (roomId == null) {
		g_http.send(res, -1, "parameters don not match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}

	var account = data.account;

	m_db.get_user_data(account, function (data) {
		if (data == null) {
			g_http.send(res, -1, "system error");
			return;
		}
		var userId = data.userId;
		var name = data.name;

		//验证玩家状态
		//todo
		//进入房间
		g_room_service.enterRoom(userId, name, roomId, function (errcode, enterInfo) {
			if (enterInfo) {
				var ret = {
					roomid: roomId,
					ip: enterInfo.ip,
					port: enterInfo.port,
					token: enterInfo.token,
					time: Date.now()
				};
				ret.sign = m_crypto.md5(roomId + ret.token + ret.time + g_config.ROOM_PRI_KEY);
				g_http.send(res, 0, "ok", ret);
			} else {
				g_http.send(res, errcode, "enter room failed.");
			}
		});
	});
});

g_app.get("/get_history_list", function (req, res) {
	var data = req.query;
	if (!check_account(req, res)) {
		return;
	}
	var account = data.account;
	m_db.get_user_data(account, function (data) {
		if (data == null) {
			g_http.send(res, -1, "system error");
			return;
		}
		var userId = data.userId;
		m_db.get_user_history(userId, function (history) {
			g_http.send(res, 0, "ok", {
				history: history
			});
		});
	});
});

g_app.get("/get_games_of_room", function (req, res) {
	var data = req.query;
	var uuid = data.uuid;
	if (uuid == null) {
		g_http.send(res, -1, "parameters don not match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}
	m_db.get_games_of_room(uuid, function (data) {
		console.log(data);
		g_http.send(res, 0, "ok", {
			data: data
		});
	});
});

g_app.get("/get_detail_of_game", function (req, res) {
	var data = req.query;
	var uuid = data.uuid;
	var index = data.index;
	if (uuid == null || index == null) {
		g_http.send(res, -1, "parameters don not match api requirements.");
		return;
	}
	if (!check_account(req, res)) {
		return;
	}
	m_db.get_detail_of_game(uuid, index, function (data) {
		g_http.send(res, 0, "ok", {
			data: data
		});
	});
});

g_app.get("/get_user_status", function (req, res) {
	if (!check_account(req, res)) {
		return;
	}
	var account = req.query.account;
	m_db.get_gems(account, function (data) {
		if (data != null) {
			g_http.send(res, 0, "ok", {
				gems: data.gems
			});
		} else {
			g_http.send(res, 1, "get gems failed.");
		}
	});
});

g_app.get("/get_message", function (a_req, a_res) {
	if (!check_account(a_req, a_res)) {
		return;
	}
	var type = a_req.query.type;

	if (type == null) {
		g_http.send(a_res, -1, "parameters don not match api requirements.");
		return;
	}

	var version = a_req.query.version;
	m_db.get_message(type, version, function (a_data) {
		if (a_data != null) {
			g_http.send(a_res, 0, "ok", {
				msg: a_data.msg,
				version: a_data.version
			});
		} else {
			g_http.send(a_res, 1, "get message failed.");
		}
	});
});

exports.start = function ($config) {
	g_config = $config;
	g_app.listen(g_config.CLEINT_PORT);
	console.log("client service is listening on port " + g_config.CLEINT_PORT);
};