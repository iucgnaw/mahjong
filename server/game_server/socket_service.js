var m_crypto = require("../utils/crypto");
var m_db = require("../utils/db");
var g_express = require("express");

var g_tokenMgr = require("./tokenmgr");
var m_roomMgr = require("./roommgr");
var m_userMgr = require("./usermgr");
var g_http = require("../utils/http");
var g_io = null;

var g_app = g_express();

//设置跨域访问
g_app.all("*", function (a_req, a_res, a_next) {
	a_res.header("Access-Control-Allow-Origin", "*");
	a_res.header("Access-Control-Allow-Headers", "X-Requested-With");
	a_res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	a_res.header("X-Powered-By", " 3.2.1")
	a_res.header("Content-Type", "application/json;charset=utf-8");
	g_http.send(a_res, 0, "ok", {});
});

var g_config = null;

exports.start = function (a_config, a_mgr) {
	g_config = a_config;

	var httpServer = require("http").createServer(g_app);
	g_io = require("socket.io")(httpServer);
	httpServer.listen(g_config.CLIENT_PORT);

	g_io.sockets.on("connection", function (a_socket) {
		a_socket.on("client_req_login", function (a_data) {
			a_data = JSON.parse(a_data);
			if (a_socket.userId != null) {
				//已经登录过的就忽略
				return;
			}
			var token = a_data.token;
			var roomId = a_data.roomid;
			var time = a_data.time;
			var sign = a_data.sign;

			console.log(roomId);
			console.log(token);
			console.log(time);
			console.log(sign);


			//检查参数合法性
			if (token == null || roomId == null || sign == null || time == null) {
				console.log("errcode: 1, invalid parameters.");
				a_socket.emit("server_resp_login_result", {
					errcode: 1,
					errmsg: "invalid parameters."
				});
				return;
			}

			//检查参数是否被篡改
			var md5 = m_crypto.md5(roomId + token + time + g_config.ROOM_PRI_KEY);
			if (md5 != sign) {
				console.log("errcode: 2, login failed. invalid sign!");
				a_socket.emit("server_resp_login_result", {
					errcode: 2,
					errmsg: "login failed. invalid sign!"
				});
				return;
			}

			//检查token是否有效
			if (g_tokenMgr.isTokenValid(token) == false) {
				console.log("errcode: 3, token expired.");
				a_socket.emit("server_resp_login_result", {
					errcode: 3,
					errmsg: "token expired."
				});
				return;
			}

			//检查房间合法性
			var userId = g_tokenMgr.getUserID(token);
			var roomId = m_roomMgr.getRoomIdByUserId(userId);

			m_userMgr.bind(userId, a_socket);
			a_socket.userId = userId;

			//返回房间信息
			var roomInfo = m_roomMgr.getRoomById(roomId);

			var seatIndex = m_roomMgr.getSeatIndexByUserId(userId);
			roomInfo.seats[seatIndex].ip = a_socket.handshake.address;

			var userData = null;
			var seats = [];
			for (var idxSeat = 0; idxSeat < roomInfo.seats.length; ++idxSeat) {
				var seat = roomInfo.seats[idxSeat];
				var online = false;
				if (seat.userId > 0) {
					online = m_userMgr.isOnline(seat.userId);
				}

				seats.push({
					userId: seat.userId,
					ip: seat.ip,
					score: seat.score,
					name: seat.name,
					online: online,
					ready: seat.ready,
					seatIndex: idxSeat
				});

				if (userId == seat.userId) {
					userData = seats[idxSeat];
				}
			}

			//通知前端
			var result = {
				errcode: 0,
				errmsg: "ok",
				data: {
					roomid: roomInfo.id,
					conf: roomInfo.conf,
					gameIndex: roomInfo.gameIndex,
					seats: seats
				}
			};
			a_socket.emit("server_resp_login_result", result);

			//通知其它客户端
			m_userMgr.broadcastMsg("brc_player_join", userData, userId, false);

			a_socket.gameMgr = roomInfo.gameMgr;

			//玩家上线，强制设置为TRUE
			a_socket.gameMgr.setReady(userId);

			a_socket.emit("server_push_login_finished");

			if (roomInfo.dismissRequest != null) {
				var dismissRequest = roomInfo.dismissRequest;
				var timeRemaining = (dismissRequest.endTime - Date.now()) / 1000;
				var a_data = {
					time: timeRemaining,
					states: dismissRequest.states
				}
				m_userMgr.sendMsg(userId, "server_brc_propose_dismiss_room", a_data);
			}
		});

		a_socket.on("client_req_prepared", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}
			a_socket.gameMgr.setReady(userId);
			m_userMgr.broadcastMsg("server_brc_player_ready", {
				userId: userId,
				ready: true
			}, userId, true);
		});

		a_socket.on("client_req_sync_handtiles", function (a_data) {
			if (a_socket.userId == null) {
				return;
			}
			var handTiles = JSON.parse(a_data);
			a_socket.gameMgr.on_client_req_sync_handtiles(a_socket.userId, handTiles);
		});

		a_socket.on("client_req_action_discard_tile", function (a_data) {
			if (a_socket.userId == null) {
				return;
			}
			var tile = a_data;
			a_socket.gameMgr.on_client_req_action_discard_tile(a_socket.userId, tile);
		});

		// Steal: Chow, Pong, Kong
		a_socket.on("client_req_action_steal", function (a_data) {
			console.assert(a_socket.userId != null);
			console.assert(a_data != null);

			var action = a_data;

			a_socket.gameMgr.on_client_req_action_steal(a_socket.userId, action);
		});

		//胡
		a_socket.on("client_req_action_win", function (a_data) {
			console.assert(a_socket.userId != null);

			a_socket.gameMgr.on_client_req_action_win(a_socket.userId);
		});

		//过
		a_socket.on("client_req_action_pass", function (a_data) {
			if (a_socket.userId == null) {
				return;
			}
			a_socket.gameMgr.on_client_req_action_pass(a_socket.userId);
		});

		//摸
		a_socket.on("client_req_action_draw_tile", function (a_data) {
			if (a_socket.userId == null) {
				return;
			}
			a_socket.gameMgr.on_client_req_action_draw_tile(a_socket.userId);
		});

		//
		a_socket.on("client_req_action_backdraw_tile", function (a_data) {
			if (a_socket.userId == null) {
				return;
			}
			a_socket.gameMgr.on_client_req_action_backdraw_tile(a_socket.userId);
		});

		//退出房间
		a_socket.on("client_req_exit_room", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}

			var roomId = m_roomMgr.getRoomIdByUserId(userId);
			if (roomId == null) {
				return;
			}

			//如果游戏已经开始，则不可以
			if (a_socket.gameMgr.hasBegan(roomId)) {
				return;
			}

			//如果是房主，则只能走解散房间
			if (m_roomMgr.isCreator(userId)) {
				return;
			}

			//通知其它玩家，有人退出了房间
			m_userMgr.broadcastMsg("server_brc_player_exit", userId, userId, false);

			m_roomMgr.exitRoom(userId);
			m_userMgr.del(userId);

			a_socket.emit("server_push_exit_result");
			a_socket.disconnect();
		});

		//解散房间
		a_socket.on("client_req_close_room", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}
			var roomId = m_roomMgr.getRoomIdByUserId(userId);
			if (roomId == null) {
				return;
			}
			//如果游戏已经开始，则不可以
			if (a_socket.gameMgr.hasBegan(roomId)) {
				return;
			}
			//如果不是房主，则不能解散房间
			if (m_roomMgr.isCreator(roomId, userId) == false) {
				return;
			}

			m_userMgr.broadcastMsg("server_brc_dismiss_room", {}, userId, true);
			m_userMgr.kickAllInRoom(roomId);
			m_roomMgr.destroyRoom(roomId);
			a_socket.disconnect();
		});

		//解散房间
		a_socket.on("client_req_propose_dismiss_room", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}
			var roomId = m_roomMgr.getRoomIdByUserId(userId);
			if (roomId == null) {
				return;
			}
			//如果游戏未开始，则不可以
			if (a_socket.gameMgr.hasBegan(roomId) == false) {
				return;
			}

			var room = a_socket.gameMgr.dissolveRequest(roomId, userId);
			if (room != null) {
				var dismissRequest = room.dismissRequest;
				var timeRemaining = (dismissRequest.endTime - Date.now()) / 1000;
				var a_data = {
					time: timeRemaining,
					states: dismissRequest.states
				}
				m_userMgr.broadcastMsg("server_brc_propose_dismiss_room", a_data, userId, true);
			}
		});

		a_socket.on("client_req_accept_dismiss_room", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}
			var roomId = m_roomMgr.getRoomIdByUserId(userId);
			if (roomId == null) {
				return;
			}

			var room = a_socket.gameMgr.dissolveAgree(roomId, userId, true);
			if (room != null) {
				var dismissRequest = room.dismissRequest;
				var timeRemaining = (dismissRequest.endTime - Date.now()) / 1000;
				var a_data = {
					time: timeRemaining,
					states: dismissRequest.states
				}
				m_userMgr.broadcastMsg("server_brc_propose_dismiss_room", a_data, userId, true);

				var doAllAgree = true;
				for (var i = 0; i < dismissRequest.states.length; ++i) {
					if (dismissRequest.states[i] == false) {
						doAllAgree = false;
						break;
					}
				}

				if (doAllAgree) {
					a_socket.gameMgr.doDissolve(roomId);
				}
			}
		});

		a_socket.on("client_req_action_reject_dismiss_room", function (a_data) {
			var userId = a_socket.userId;
			if (userId == null) {
				return;
			}
			var roomId = m_roomMgr.getRoomIdByUserId(userId);
			if (roomId == null) {
				return;
			}

			var room = a_socket.gameMgr.dissolveAgree(roomId, userId, false);
			if (room != null) {
				m_userMgr.broadcastMsg("server_brc_reject_dismiss_room", {}, userId, true);
			}
		});

		//断开链接
		a_socket.on("disconnect", function (a_data) {
			var userId = a_socket.userId;
			if (!userId) {
				return;
			}

			//如果是旧链接断开，则不需要处理。
			if (m_userMgr.get(userId) != a_socket) {
				return;
			}

			var a_data = {
				userId: userId,
				online: false
			};

			//通知房间内其它玩家
			m_userMgr.broadcastMsg("server_brc_player_status_change", a_data, userId, false);

			//清除玩家的在线信息
			m_userMgr.del(userId);
			a_socket.userId = null;
		});

		a_socket.on("client_heartbeat", function (a_data) {
			var userId = a_socket.userId;
			if (!userId) {
				return;
			}
			//console.log("client_heartbeat");
			a_socket.emit("server_heartbeat");
		});
	});

	console.log("game server is listening on " + g_config.CLIENT_PORT);
};