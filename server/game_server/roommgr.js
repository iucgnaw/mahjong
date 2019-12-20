var m_db = require("../utils/db");

var g_rooms = {};
var g_creatingRooms = {};

var g_userLocation = {};
var g_totalRooms = 0;

var g_basePoint = [1, 2, 5];
var g_maxFaan = [3, 4, 5];
var g_totalHands = [4, 8];
var g_roomCost = [2, 3];

function generateRoomId() {
	var roomId = "";
	for (var i = 0; i < 6; ++i) {
		roomId += Math.floor(Math.random() * 10);
	}
	return roomId;
}

function constructRoomFromDb(a_dbData) {
	var roomInfo = {
		uuid: a_dbData.uuid,
		id: a_dbData.id,
		gameIndex: a_dbData.num_of_turns,
		createTime: a_dbData.create_time,
		nextDealer: a_dbData.next_dealer,
		seats: new Array(4),
		conf: JSON.parse(a_dbData.base_info)
	};

	roomInfo.gameMgr = require("./gamemgr_xlch");

	var roomId = roomInfo.id;

	for (var i = 0; i < roomInfo.seats.length; ++i) {
		var seat = roomInfo.seats[i] = {};
		seat.userId = a_dbData["user_id" + i];
		seat.score = a_dbData["user_score" + i];
		seat.name = a_dbData["user_name" + i];
		seat.ready = false;
		seat.seatIndex = i;

		if (seat.userId > 0) {
			g_userLocation[seat.userId] = {
				roomId: roomId,
				seatIndex: i
			};
		}
	}
	g_rooms[roomId] = roomInfo;
	g_totalRooms++;
	return roomInfo;
}

exports.createRoom = function (a_creator, a_roomConf, a_gems, a_ip, a_port, a_callback) {
	var cost = g_roomCost[a_roomConf.jushuxuanze];
	if (cost > a_gems) {
		a_callback(2222, null);
		return;
	}

	var fnCreate = function () {
		var roomId = generateRoomId();
		if (g_rooms[roomId] != null || g_creatingRooms[roomId] != null) {
			fnCreate();
		} else {
			g_creatingRooms[roomId] = true;
			m_db.is_room_exist(roomId, function (ret) {

				if (ret) {
					delete g_creatingRooms[roomId];
					fnCreate();
				} else {
					var createTime = Math.ceil(Date.now() / 1000);
					var roomInfo = {
						uuid: "",
						id: roomId,
						gameIndex: 0,
						createTime: createTime,
						nextDealer: 0,
						seats: [],
						conf: {
							creator: a_creator,
						}
					};

					roomInfo.gameMgr = require("./gamemgr_xlch");

					for (var i = 0; i < 4; ++i) {
						roomInfo.seats.push({
							userId: 0,
							score: 0,
							name: "",
							ready: false,
							seatIndex: i,
						});
					}

					//写入数据库
					var conf = roomInfo.conf;
					m_db.create_room(roomInfo.id, roomInfo.conf, a_ip, a_port, createTime, function (uuid) {
						delete g_creatingRooms[roomId];
						if (uuid != null) {
							roomInfo.uuid = uuid;
							console.log(uuid);
							g_rooms[roomId] = roomInfo;
							g_totalRooms++;
							a_callback(0, roomId);
						} else {
							a_callback(3, null);
						}
					});
				}
			});
		}
	}

	fnCreate();
};

exports.destroyRoom = function (a_roomId) {
	var roomInfo = g_rooms[a_roomId];
	if (roomInfo == null) {
		return;
	}

	for (var i = 0; i < 4; ++i) {
		var userId = roomInfo.seats[i].userId;
		if (userId > 0) {
			delete g_userLocation[userId];
			m_db.set_room_id_of_user(userId, null);
		}
	}

	delete g_rooms[a_roomId];
	g_totalRooms--;
	m_db.delete_room(a_roomId);
}

exports.getTotalRooms = function () {
	return g_totalRooms;
}

exports.getRoomById = function (a_roomId) {
	return g_rooms[a_roomId];
};

exports.isCreator = function (a_roomId, a_userId) {
	var roomInfo = g_rooms[a_roomId];
	if (roomInfo == null) {
		return false;
	}
	return roomInfo.conf.creator == a_userId;
};

exports.enterRoom = function (a_roomId, a_userId, a_userName, a_callback) {
	var fnTakeSeat = function (a_room) {
		if (exports.getRoomIdByUserId(a_userId) == a_roomId) {
			//已存在
			return 0;
		}

		for (var i = 0; i < a_room.seats.length; ++i) {
			var seat = a_room.seats[i];
			if (seat.userId <= 0) {
				seat.userId = a_userId;
				seat.name = a_userName;
				g_userLocation[a_userId] = {
					roomId: a_roomId,
					seatIndex: i
				};
				//console.log(userLocation[userId]);
				m_db.update_seat_info(a_roomId, i, seat.userId, "", seat.name);
				//正常
				return 0;
			}
		}
		//房间已满
		return 1;
	}
	var room = g_rooms[a_roomId];
	if (room) {
		var ret = fnTakeSeat(room);
		a_callback(ret);
	} else {
		m_db.get_room_data(a_roomId, function (a_dbData) {
			if (a_dbData == null) {
				//找不到房间
				a_callback(2);
			} else {
				//construct room.
				room = constructRoomFromDb(a_dbData);
				//
				var ret = fnTakeSeat(room);
				a_callback(ret);
			}
		});
	}
};

exports.setReady = function (a_userId, a_ready) {
	var roomId = exports.getRoomIdByUserId(a_userId);
	if (roomId == null) {
		return;
	}
	var room = exports.getRoomById(roomId);
	if (room == null) {
		return;
	}
	var seatIndex = exports.getSeatIndexByUserId(a_userId);
	if (seatIndex == null) {
		return;
	}

	room.seats[seatIndex].ready = a_ready;
}

exports.isReady = function (a_userId) {
	var roomId = exports.getRoomIdByUserId(a_userId);
	if (roomId == null) {
		return;
	}
	var room = exports.getRoomById(roomId);
	if (room == null) {
		return;
	}
	var seatIndex = exports.getSeatIndexByUserId(a_userId);
	if (seatIndex == null) {
		return;
	}

	return room.seats[seatIndex].ready;
}


exports.getRoomIdByUserId = function (a_userId) {
	var location = g_userLocation[a_userId];
	if (location != null) {
		return location.roomId;
	}
	return null;
};

exports.getSeatIndexByUserId = function (a_userId) {
	var location = g_userLocation[a_userId];
	if (location != null) {
		return location.seatIndex;
	}
	return null;
};

exports.getUserLocations = function () {
	return g_userLocation;
};

exports.exitRoom = function (a_userId) {
	var location = g_userLocation[a_userId];
	if (location == null)
		return;

	var roomId = location.roomId;
	var seatIndex = location.seatIndex;
	var room = g_rooms[roomId];
	delete g_userLocation[a_userId];
	if (room == null || seatIndex == null) {
		return;
	}

	var seat = room.seats[seatIndex];
	seat.userId = 0;
	seat.name = "";

	var numOfPlayers = 0;
	for (var i = 0; i < room.seats.length; ++i) {
		if (room.seats[i].userId > 0) {
			numOfPlayers++;
		}
	}

	m_db.set_room_id_of_user(a_userId, null);

	if (numOfPlayers == 0) {
		exports.destroyRoom(roomId);
	}
};