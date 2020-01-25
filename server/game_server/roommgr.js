var m_db = require("../utils/db");

var g_rooms = {};
var g_creatingRooms = {};

var g_userLocation = {};
var g_totalRooms = 0; // TOFIX can be replaced by g_rooms.length?

var g_roomCost = [2, 3];

function generateRoomId() {
	var roomId = "";
	for (var i = 0; i < 6; ++i) {
		roomId += Math.floor(Math.random() * 10);
	}
	return roomId;
}

function constructRoomFromDb(a_dbData) {
	var room = {
		uuid: a_dbData.uuid,
		id: a_dbData.id,
		gameIndex: a_dbData.num_of_turns,
		createTime: a_dbData.create_time,
		nextDealer: a_dbData.next_dealer,
		seats: [],
		conf: JSON.parse(a_dbData.base_info)
	};

	room.gameMgr = require("./gamemgr_xlch");

	for (var idxSeat = 0; idxSeat < room.conf.playerNum; ++idxSeat) {
		room.seats[idxSeat] = {};

		room.seats[idxSeat].userId = a_dbData["user_id_" + idxSeat];
		room.seats[idxSeat].score = a_dbData["user_score_" + idxSeat];
		room.seats[idxSeat].name = a_dbData["user_name_" + idxSeat];
		room.seats[idxSeat].ready = false;
		room.seats[idxSeat].seatIndex = idxSeat;

		if (room.seats[idxSeat].userId > 0) {
			g_userLocation[room.seats[idxSeat].userId] = {
				roomId: room.id,
				seatIndex: idxSeat
			};
		}
	}
	g_rooms[room.id] = room; // TODO understand [] operator on {}
	g_totalRooms++;
	return room;
}

exports.createRoom = function (a_creator, a_roomConf, a_gems, a_ip, a_port, a_callback) {
	var cost = g_roomCost[a_roomConf.handNumSelection];
	if (cost > a_gems) {
		a_callback(2222, null);
		return;
	}

	var fnCreate = function () {
		var roomId = generateRoomId();

		if (g_rooms[roomId] != null ||
			g_creatingRooms[roomId] != null) {
			fnCreate();
		} else { // No existing room, No creating room
			g_creatingRooms[roomId] = true;

			m_db.is_room_exist(roomId, function (a_ret) {
				if (a_ret) {
					delete g_creatingRooms[roomId];
					fnCreate();
				} else {
					var createTime = Math.ceil(Date.now() / 1000);
					var room = {
						uuid: "",
						id: roomId,
						gameIndex: 0,
						createTime: createTime,
						nextDealer: 0,
						seats: [],
						conf: {
							creator: a_creator,
							playerNum: a_roomConf.playerNum,
						}
					};

					room.gameMgr = require("./gamemgr_xlch");

					for (var idxSeat = 0; idxSeat < room.conf.playerNum; ++idxSeat) {
						room.seats.push({
							userId: 0,
							score: 0,
							name: "",
							ready: false,
							seatIndex: idxSeat,
						});
					}

					//写入数据库
					m_db.create_room(room.id, room.conf, a_ip, a_port, createTime, function (a_uuid) {
						delete g_creatingRooms[roomId];
						if (a_uuid != null) {
							room.uuid = a_uuid;
							g_rooms[roomId] = room;
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
	var room = g_rooms[a_roomId];
	if (room == null) {
		return;
	}

	for (var idxSeat = 0; idxSeat < room.seats.length; ++idxSeat) {
		var userId = room.seats[idxSeat].userId;
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
	if (g_rooms[a_roomId] == null) {
		return false;
	}
	return g_rooms[a_roomId].conf.creator == a_userId;
};

exports.enterRoom = function (a_roomId, a_userId, a_userName, a_callback) {
	var fnTakeSeat = function (a_room) {
		if (exports.getRoomIdByUserId(a_userId) == a_roomId) {
			return 0;
		}

		for (var idxSeat = 0; idxSeat < a_room.conf.playerNum; idxSeat++) {
			var seat = a_room.seats[idxSeat];
			if (seat.userId <= 0) {
				seat.userId = a_userId;
				seat.name = a_userName;
				g_userLocation[a_userId] = {
					roomId: a_roomId,
					seatIndex: idxSeat
				};

				m_db.update_seat_info(a_roomId, idxSeat, seat.userId, "", seat.name);

				return 0;
			}
		}

		// Doesn't find empty seat, room is full
		return 1;
	}

	var room = g_rooms[a_roomId];
	if (room) { // Room exist
		var ret = fnTakeSeat(room);
		a_callback(ret);
	} else { // Room doesn't exist
		m_db.get_room_data(a_roomId, function (a_dbData) {
			if (a_dbData == null) {
				//找不到房间
				a_callback(2);
			} else { // Find room in DB
				room = constructRoomFromDb(a_dbData);
				var ret = fnTakeSeat(room);
				a_callback(ret);
			}
		});
	}
};

exports.setReady = function (a_userId, a_isReady) {
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

	room.seats[seatIndex].ready = a_isReady;
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
	if (location == null) {
		return;
	}

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

	// Check remaining players
	var numOfPlayers = 0;
	for (var idxSeat = 0; idxSeat < room.seats.length; ++idxSeat) {
		if (room.seats[idxSeat].userId > 0) {
			numOfPlayers++;
		}
	}

	m_db.set_room_id_of_user(a_userId, null);

	if (numOfPlayers == 0) {
		exports.destroyRoom(roomId);
	}
};