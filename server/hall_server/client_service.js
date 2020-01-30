var m_crypto = require("../utils/crypto");
var m_express = require("express");
var m_db = require("../utils/db");
var m_http = require("../utils/http");
var g_room_service = require("./room_service");

var g_express_client_service = m_express();
var g_config = null;

exports.start = function (a_config) {
	g_config = a_config;
	g_express_client_service.listen(g_config.CLEINT_PORT);
	console.log("client service is listening on port " + g_config.CLEINT_PORT);
};

function check_account(a_request, a_response) {
	var account = a_request.query.account;
	var sign = a_request.query.sign;
	if (account == null) {
		m_http.send(a_response, 1, "Account is null.");
		return false;
	}
	if (sign == null) {
		m_http.send(a_response, 1, "Sign is null.");
		return false;
	}
	/*
	var serverSign = crypto.md5(account + a_request.ip + g_config.ACCOUNT_PRI_KEY);
	if (serverSign != sign) {
		http.send(a_response, 2, "Client Sign doesn't match Server Sign.");
		return false;
	}
	*/
	return true;
}

//设置跨域访问
g_express_client_service.all("*", function (a_request, a_response, a_fnNext) {
	a_response.header("Access-Control-Allow-Origin", "*");
	a_response.header("Access-Control-Allow-Headers", "X-Requested-With");
	a_response.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	a_response.header("X-Powered-By", " 3.2.1");
	a_response.header("Content-Type", "application/json;charset=utf-8");
	a_fnNext();
});

g_express_client_service.get("/login_as_guest", function (a_request, a_response) {
	if (!check_account(a_request, a_response)) {
		return;
	}

	var ip = a_request.ip;
	if (ip.indexOf("::ffff:") != -1) { // IPv6 address
		ip = ip.substr(7); // Get IPv4 part
	}

	var account = a_request.query.account;
	m_db.get_user_data(account, function (a_user) {
		if (a_user == null) {
			m_http.send(a_response, 0, "ok");
			return;
		}

		var user = {
			account: a_user.account,
			userId: a_user.userId,
			name: a_user.name,
			lv: a_user.lv,
			exp: a_user.exp,
			coins: a_user.coins,
			gems: a_user.gems,
			ip: ip,
			sex: a_user.sex,
		};

		m_db.get_room_id_of_user(a_user.userId, function (a_roomId) {
			//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
			if (a_roomId != null) {
				//检查房间是否存在于数据库中
				m_db.is_room_exist(a_roomId, function (a_exist) {
					if (a_exist) {
						user.roomId = a_roomId;
					} else {
						//如果房间不在了，表示信息不同步，清除掉用户记录
						m_db.set_room_id_of_user(a_user.userId, null);
					}
					m_http.send(a_response, 0, "Ok.", user);
				});
			} else {
				m_http.send(a_response, 0, "Ok.", user);
			}
		});
	});
});

g_express_client_service.get("/create_user", function (a_request, a_response) {
	if (!check_account(a_request, a_response)) {
		return;
	}
	var account = a_request.query.account;
	var name = a_request.query.name;
	var coins = 1000;
	var gems = 1021;
	// console.log(name);

	m_db.is_user_exist(account, function (a_exist) {
		if (!a_exist) {
			m_db.create_user(account, name, coins, gems, 0, null, function (a_ret) {
				if (a_ret == null) {
					m_http.send(a_response, 2, "Create user fail.");
				} else {
					m_http.send(a_response, 0, "Ok.");
				}
			});
		} else {
			m_http.send(a_response, 1, "User already exist.");
		}
	});
});

g_express_client_service.get("/create_private_room", function (a_request, a_response) {
	//验证参数合法性
	var query = a_request.query;
	//验证玩家身份
	if (!check_account(a_request, a_response)) {
		return;
	}

	var account = query.account;
	var conf = query.conf;

	query.account = null;
	query.sign = null;

	m_db.get_user_data(account, function (a_user) {
		if (a_user == null) {
			m_http.send(a_response, 1, "Get user data fail.");
			return;
		}
		var userId = a_user.userId;
		var name = a_user.name;
		//验证玩家状态
		m_db.get_room_id_of_user(userId, function (a_roomId) {
			if (a_roomId != null) {
				m_http.send(a_response, -1, "User is already playing in room.");
				return;
			}
			//创建房间
			g_room_service.createRoom(account, userId, conf, function (a_err, a_roomId) {
				if (a_err == 0 && a_roomId != null) {
					g_room_service.enterRoom(userId, name, a_roomId, function (a_errCode, a_enterInfo) {
						if (a_enterInfo) {
							var ret = {
								roomId: a_roomId,
								ip: a_enterInfo.ip,
								port: a_enterInfo.port,
								token: a_enterInfo.token,
								time: Date.now()
							};
							ret.sign = m_crypto.md5(ret.roomId + ret.token + ret.time + g_config.ROOM_PRI_KEY);
							m_http.send(a_response, 0, "ok", ret);
						} else {
							m_http.send(a_response, a_errCode, "Room does not exist.");
						}
					});
				} else {
					m_http.send(a_response, a_err, "Create room fail.");
				}
			});
		});
	});
});

g_express_client_service.get("/enter_private_room", function (a_request, a_response) {
	var data = a_request.query;
	var roomId = data.roomId;
	if (roomId == null) {
		m_http.send(a_response, -1, "Parameters do not match api requirements.");
		return;
	}
	if (!check_account(a_request, a_response)) {
		return;
	}

	var account = data.account;

	m_db.get_user_data(account, function (a_user) {
		if (a_user == null) {
			m_http.send(a_response, -1, "Get user data fail.");
			return;
		}
		var userId = a_user.userId;
		var name = a_user.name;

		//验证玩家状态
		//todo
		//进入房间
		g_room_service.enterRoom(userId, name, roomId, function (a_errcode, a_enterInfo) {
			if (a_enterInfo) {
				var ret = {
					roomId: roomId,
					ip: a_enterInfo.ip,
					port: a_enterInfo.port,
					token: a_enterInfo.token,
					time: Date.now()
				};
				ret.sign = m_crypto.md5(roomId + ret.token + ret.time + g_config.ROOM_PRI_KEY);
				m_http.send(a_response, 0, "ok", ret);
			} else {
				m_http.send(a_response, a_errcode, "Enter room fail.");
			}
		});
	});
});

g_express_client_service.get("/get_history_list", function (a_request, a_response) {
	var data = a_request.query;
	if (!check_account(a_request, a_response)) {
		return;
	}
	var account = data.account;
	m_db.get_user_data(account, function (data) {
		if (data == null) {
			m_http.send(a_response, -1, "Get user data fail.");
			return;
		}
		var userId = data.userId;
		m_db.get_user_history(userId, function (history) {
			m_http.send(a_response, 0, "Ok.", {
				history: history
			});
		});
	});
});

g_express_client_service.get("/get_games_of_room", function (a_request, a_response) {
	var data = a_request.query;
	var uuid = data.uuid;
	if (uuid == null) {
		m_http.send(a_response, -1, "Parameters do not match api requirements.");
		return;
	}
	if (!check_account(a_request, a_response)) {
		return;
	}
	m_db.get_games_of_room(uuid, function (data) {
		// console.log(data);
		m_http.send(a_response, 0, "Ok.", {
			data: data
		});
	});
});

g_express_client_service.get("/get_detail_of_game", function (a_request, a_response) {
	var data = a_request.query;
	var uuid = data.uuid;
	var index = data.index;
	if (uuid == null || index == null) {
		m_http.send(a_response, -1, "Parameters do not match api requirements.");
		return;
	}
	if (!check_account(a_request, a_response)) {
		return;
	}
	m_db.get_detail_of_game(uuid, index, function (data) {
		m_http.send(a_response, 0, "Ok.", {
			data: data
		});
	});
});

g_express_client_service.get("/get_user_status", function (a_request, a_response) {
	if (!check_account(a_request, a_response)) {
		return;
	}
	var account = a_request.query.account;
	m_db.get_gems(account, function (data) {
		if (data != null) {
			m_http.send(a_response, 0, "Ok.", {
				gems: data.gems
			});
		} else {
			m_http.send(a_response, 1, "Get gems fail.");
		}
	});
});

g_express_client_service.get("/get_message", function (a_request, a_response) {
	if (!check_account(a_request, a_response)) {
		return;
	}
	var type = a_request.query.type;

	if (type == null) {
		m_http.send(a_response, -1, "Parameters do not match api requirements.");
		return;
	}

	var version = a_request.query.version;
	m_db.get_message(type, version, function (a_msg) {
		if (a_msg != null) {
			m_http.send(a_response, 0, "Ok.", {
				msg: a_msg.msg,
				version: a_msg.version
			});
		} else {
			m_http.send(a_response, 1, "Get message fail.");
		}
	});
});
