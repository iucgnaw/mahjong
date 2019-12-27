var m_mahjong = require("../../common/mahjong.js");
var m_roomMgr = require("./roommgr");
var m_userMgr = require("./usermgr");
var m_mjUtils = require("./mjutils");
var m_db = require("../utils/db");
var m_crypto = require("../utils/crypto");

var g_games = {};
var g_seatByUserId = {};

var MJ_ACTION_DISCARD_TILE = 1;
var MJ_ACTION_DRAW_TILE = 2;
var MJ_ACTION_PONG = 3;
var MJ_ACTION_KONG = 4;
var MJ_ACTION_WIN = 5;
var MJ_ACTION_WIN_SELFDRAW = 6;
var MJ_ACTION_CHOW = 7;

function drawTile(a_game, a_seatIndex) {
    if (a_game.tilewall.length <= 0) { // No more tile in Tiles Wall
        return m_mahjong.MJ_TILE_INVALID;
    }

    var tile = a_game.tilewall.shift();
    var seat = a_game.seats[a_seatIndex];
    var handTile = {};
    handTile.tile = tile;
    handTile.pose = "standing";
    handTile.face = "front";
    seat.handTiles.push(handTile);

    return tile;
}

function backdrawTile(a_game, a_seatIndex) {
    if (a_game.tilewall.length <= 0) { // No more tile in Tiles Wall
        return m_mahjong.MJ_TILE_INVALID;
    }

    var tile = a_game.tilewall.pop();
    var seat = a_game.seats[a_seatIndex];
    var handTile = {};
    handTile.tile = tile;
    handTile.pose = "standing";
    handTile.face = "front";
    seat.handTiles.push(handTile);

    return tile;
}

function dealTiles(a_game) {
    // TODO Should each seat draw 4 tiles for 3 rounds, then draw 1 tile each
    var seatIndex = a_game.dealer;
    for (var idxRound = 0; idxRound < 12; ++idxRound) {
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);

        seatIndex++;
        seatIndex %= 4;
    }
    for (var idxRound = 0; idxRound < 4; ++idxRound) {
        drawTile(a_game, seatIndex);

        seatIndex++;
        seatIndex %= 4;
    }
    drawTile(a_game, a_game.dealer); // Draw last tile for dealer

    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        m_mahjong.sortHandTiles(a_game.seats[idxSeat].handTiles);
    }

    a_game.turn = a_game.dealer;

    var jokerTile;
    while (true) {
        var dicesNumber = m_mahjong.toss2Dices();
        jokerTile = a_game.tilewall[(a_game.tilewall.length - 1) - ((dicesNumber - 1) * 2)];
        if ((m_mahjong.getTileSuit(jokerTile) != m_mahjong.MJ_TILE_SUIT_HONOR) &&
            (m_mahjong.getTileSuit(jokerTile) != m_mahjong.MJ_TILE_SUIT_INVALID)) {
            break;
        }
    }
    a_game.jokerTile = jokerTile;
}

function changeTurn(a_game, a_seatIndex) {
    if (a_seatIndex == null) { // Don't get this argument, change turn to next seat
        a_game.turn++;
        a_game.turn %= 4;
        return;
    } else { // Change turn to specified seat
        a_game.turn = a_seatIndex;
    }
}

function doDrawTile(a_game) {
    var seatTurn = a_game.seats[a_game.turn];
    var tile = drawTile(a_game, a_game.turn);
    if (tile == -1) {
        doGameOver(a_game, seatTurn.userId);
        return;
    }

    seatTurn.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

    var game = a_game;
    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
}

function doBackdrawTile(a_game) {
    var seatTurn = a_game.seats[a_game.turn];
    var tile = backdrawTile(a_game, a_game.turn);
    if (tile == -1) {
        doGameOver(a_game, seatTurn.userId);
        return;
    }

    // seatTurn.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

    var game = a_game;
    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
}

function doGameOver(a_game, a_userId, a_forceEnd) {
    var roomId = m_roomMgr.getRoomIdByUserId(a_userId);
    if (roomId == null) {
        return;
    }
    var room = m_roomMgr.getRoomById(roomId);
    if (room == null) {
        return;
    }

    var results = [];
    var dbResult = [0, 0, 0, 0];

    var fnNotifyResult = function (a_isEnd) {
        var endInfo = null;
        if (a_isEnd) {
            endInfo = [];
            for (var i = 0; i < room.seats.length; ++i) {
                var seat = room.seats[i];
                endInfo.push({});
            }
        }

        m_userMgr.broadcastMsg("server_brc_hand_end", {
            results: results,
            endinfo: endInfo
        }, a_userId, true);

        //如果局数已够，则进行整体结算，并关闭房间
        if (a_isEnd) {
            setTimeout(function () {
                if (room.gameIndex > 1) {
                    store_history(room);
                }
                m_userMgr.kickAllInRoom(roomId);
                m_roomMgr.destroyRoom(roomId);
                m_db.archive_games(room.uuid);
            }, 1500);
        }
    }

    if (a_game != null) {
        for (var i = 0; i < room.seats.length; ++i) {
            var roomSeat = room.seats[i];
            var gameSeat = a_game.seats[i];

            roomSeat.ready = false;
            roomSeat.score += gameSeat.score

            var userResult = {
                userId: gameSeat.userId,
                actions: [],
                melds: gameSeat.melds,
                handTiles: gameSeat.handTiles,
                score: gameSeat.score,
                totalscore: roomSeat.score,
                qingyise: gameSeat.qingyise,
                jingouhu: gameSeat.isJinGouHu,
            }

            dbResult[i] = gameSeat.score;
            delete g_seatByUserId[gameSeat.userId]; // TODO: ?
        }
        delete g_games[roomId]; // TODO: ?

        var dealer = room.nextDealer;
        room.nextDealer = (a_game.turn + 1) % 4;

        if (dealer != room.nextDealer) {
            m_db.update_next_dealer(roomId, room.nextDealer);
        }
    }

    if (a_forceEnd || a_game == null) {
        fnNotifyResult(true);
    } else {
        //保存游戏
        store_game(a_game, function (ret) {
            m_db.update_game_result(room.uuid, a_game.gameIndex, dbResult);

            //记录玩家操作
            var actionListJson = JSON.stringify(a_game.actionList);
            m_db.update_game_action_records(room.uuid, a_game.gameIndex, actionListJson);

            //保存游戏局数
            m_db.update_num_of_turns(roomId, room.gameIndex);

            //如果是第一次，则扣除房卡
            if (room.gameIndex == 1) {
                var cost = 2;
                if (room.conf.maxHandCount == 8) {
                    cost = 3;
                }
                m_db.cost_gems(a_game.seats[0].userId, cost);
            }

            var isEnd = (room.gameIndex >= room.conf.maxHandCount);
            fnNotifyResult(isEnd);
        });
    }
}

exports.setReady = function (a_userId, a_callback) {
    var roomId = m_roomMgr.getRoomIdByUserId(a_userId);
    if (roomId == null) {
        return;
    }
    var room = m_roomMgr.getRoomById(roomId);
    if (room == null) {
        return;
    }

    m_roomMgr.setReady(a_userId, true);

    var game = g_games[roomId];
    if (game == null) { // Non-exist game
        if (room.seats.length == 4) {
            for (var i = 0; i < room.seats.length; ++i) {
                var gameSeat = room.seats[i];
                if (gameSeat.ready == false ||
                    m_userMgr.isOnline(gameSeat.userId) == false) {
                    return;
                }
            }
            //4个人到齐了，并且都准备好了，则开始新的一局
            exports.begin(roomId);
        }
    } else { // Exist game
        var gameForClient = {};
        copyGameForClient(gameForClient, game, a_userId);
        m_userMgr.sendMsg(a_userId, "server_push_game_sync", gameForClient);
    }
}

function store_single_history(a_userId, a_history) {
    m_db.get_user_history(a_userId, function (a_data) {
        if (a_data == null) {
            a_data = [];
        }
        while (a_data.length >= 10) {
            a_data.shift();
        }
        a_data.push(a_history);
        m_db.update_user_history(a_userId, a_data);
    });
}

function store_history(a_roomInfo) {
    var seats = a_roomInfo.seats;
    var history = {
        uuid: a_roomInfo.uuid,
        id: a_roomInfo.id,
        time: a_roomInfo.createTime,
        seats: new Array(4)
    };

    for (var i = 0; i < seats.length; ++i) {
        var seat = seats[i];
        var historySeat = history.seats[i] = {};
        historySeat.userId = seat.userId;
        historySeat.name = m_crypto.toBase64(seat.name);
        historySeat.score = seat.score;
    }

    for (var i = 0; i < seats.length; ++i) {
        var seat = seats[i];
        store_single_history(seat.userId, history);
    }
}

function construct_game_base_info(a_game) {
    var baseInfo = {
        type: a_game.conf.type,
        dealer: a_game.dealer,
        index: a_game.gameIndex,
        tilewall: a_game.tilewall,
        seats: new Array(4)
    }
    for (var i = 0; i < baseInfo.seats.length; ++i) {
        baseInfo.seats[i] = a_game.seats[i].handTiles; // TOFIX, seats != seats[].handTiles
    }
    a_game.baseInfoJson = JSON.stringify(baseInfo);
}

function store_game(a_game, a_callback) {
    m_db.create_game(a_game.room.uuid, a_game.gameIndex, a_game.baseInfoJson, a_callback);
}

//开始新的一局
exports.begin = function (a_roomId) {
    var room = m_roomMgr.getRoomById(a_roomId);
    console.assert(room != null);
    var roomSeats = room.seats;

    var game = {
        conf: room.conf,
        room: room,
        gameIndex: room.gameIndex,

        dealer: room.nextDealer,

        tilewall: [], // TODO: use constant

        seats: new Array(4), // TODO: use constant

        turn: 0,

        jokerTile: m_mahjong.MJ_TILE_INVALID,

        actionList: [],
    };

    room.gameIndex++;

    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var seat = game.seats[idxSeat] = {};

        seat.game = game;

        seat.seatIndex = idxSeat;

        seat.userId = roomSeats[idxSeat].userId;
        seat.handTiles = [];
        seat.honorTiles = [];
        seat.discardedTiles = [];
        seat.melds = [];

        seat.score = 0;

        g_seatByUserId[seat.userId] = seat;
    }
    g_games[a_roomId] = game;

    //洗牌
    m_mahjong.shuffleTilewall(game.tilewall);

    //发牌
    dealTiles(game);

    for (var idxSeat = 0; idxSeat < roomSeats.length; ++idxSeat) {
        var seat = roomSeats[idxSeat];

        // m_userMgr.sendMsg(seat.userId, "server_brc_hand_count", room.gameIndex);

        seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;
    }
    construct_game_base_info(game);

    //通知玩家出牌方
    m_userMgr.broadcastMsg("server_brc_change_turn", game.seats[game.turn].userId, game.seats[game.turn].userId, true);
    game.seats[game.turn].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_sync_handtiles = function (a_userId, a_handTiles) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;

    seat.handTiles = a_handTiles;

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_action_discard_tile = function (a_userId, a_tile) {
    a_tile = Number.parseInt(a_tile);
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;

    // Check FSM
    if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN)) {
        m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Discard] tile on state: " + seat.fsmPlayerState);
        return;
    }

    // Remove tile from hands
    var idxTileToRemove = -1;
    for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
        if (seat.handTiles[idxTile].tile == a_tile) {
            idxTileToRemove = idxTile;
            break;
        }
    }
    if (idxTileToRemove == -1) {
        m_userMgr.sendMsg(a_userId, "server_push_message", "Can't find tile: " + a_tile + " in hands: " + seat.handTiles);
        return;
    }
    seat.handTiles.splice(idxTileToRemove, 1);
    for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
        seat.handTiles[idxTile].pose = "standing";
    }

    m_mahjong.sortHandTiles(seat.handTiles);

    seat.discardedTiles.push(a_tile);

    // Notify all seats
    m_userMgr.broadcastMsg("server_brc_discarding_tile", {
        userId: seat.userId,
        tile: a_tile
    }, seat.userId, true);
    for (var i = 0; i < game.seats.length; ++i) {
        if (game.seats[i].seatIndex == seat.seatIndex) {
            game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE;
            continue;
        }

        game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE;
    }

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_action_steal = function (a_userId, a_action) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;
    var message;

    switch (a_action) {
        case m_mahjong.MJ_ACTION_SET_ASIDE:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            message = "server_brc_set_aside"

            // Copy lying tiles to honor tiles
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "lying") {
                    seat.honorTiles.push(seat.handTiles[idxTile].tile);
                }
            }
            // Remove lying tiles from hand tiles
            for (var idxTile = seat.handTiles.length - 1; idxTile >= 0; idxTile--) {
                if (seat.handTiles[idxTile].pose == "lying") {
                    seat.handTiles.splice(idxTile, 1);
                }
            }
            break;

        case m_mahjong.MJ_ACTION_CHOW:
            if (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            message = "server_brc_chowing"

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_CHOWING;
            for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_IDLE) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING;
                }
            }
            break;

        case m_mahjong.MJ_ACTION_PONG:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            message = "server_brc_ponging"

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_PONGING;
            for (var i = 0; i < game.seats.length; ++i) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if ((game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_IDLE) ||
                    (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING)) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING;
                }
            }
            break;

        case m_mahjong.MJ_ACTION_KONG:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            message = "server_brc_konging"

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_KONGING;
            for (var i = 0; i < game.seats.length; ++i) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if ((game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_IDLE) ||
                    (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING)) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING;
                }
            }
            break;
    }

    // Tell clients
    m_userMgr.broadcastMsg(message, seat.userId, seat.userId, true);

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_action_win = function (a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var seatIndex = seat.seatIndex;
    var game = seat.game;

    var turnSeat = game.seats[game.turn];

    var tile = -1;

    //通知前端，有人和牌了
    m_userMgr.broadcastMsg("server_brc_win", {
        seatIndex: seatIndex,
        hupai: tile
    }, seat.userId, true);

    for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
        seat.handTiles[idxTile].pose = "lying";
    }

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
    // doGameOver(game, turnSeat.userId);
};

function copyGameForClient(a_gameForClient, a_game, a_userId) {
    a_gameForClient.tilewallRemaining = a_game.tilewall.length;
    a_gameForClient.dealer = a_game.dealer;
    a_gameForClient.turn = a_game.turn;
    a_gameForClient.jokerTile = a_game.jokerTile;

    a_gameForClient.seats = [];
    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        var seat = {};

        // seat.handTiles = a_game.seats[idxSeat].handTiles;
        seat.handTiles = JSON.parse(JSON.stringify(a_game.seats[idxSeat].handTiles));
        if (a_game.seats[idxSeat].userId != a_userId) { // Invalidize handTiles
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "standing") { // and only invalidize stading ones
                    seat.handTiles[idxTile].tile = m_mahjong.MJ_TILE_INVALID;
                }
            }
        }
        seat.honorTiles = a_game.seats[idxSeat].honorTiles;
        seat.discardedTiles = a_game.seats[idxSeat].discardedTiles;
        seat.melds = a_game.seats[idxSeat].melds;
        seat.huinfo = a_game.seats[idxSeat].huinfo;

        seat.fsmPlayerState = a_game.seats[idxSeat].fsmPlayerState;

        a_gameForClient.seats.push(seat);
    }
}

exports.on_client_req_action_pass = function (a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);

    var seatIndex = seat.seatIndex;
    var game = seat.game;

    if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING)) {
        m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Pass] on state: " + seat.fsmPlayerState);
        return;
    }

    // Tell everyone
    m_userMgr.broadcastMsg("server_brc_player_pass", {
        userId: seat.userId
    }, seat.userId, true);
    seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;

    // Check whether any player is still thinking
    var anyPlayerThinking = false;
    for (var i = 0; i < game.seats.length; ++i) {
        if ((game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) ||
            (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) ||
            (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING)) {
            // console.log("game.seats[" + i + "].fsmPlayerState: " + game.seats[i].fsmPlayerState);
            anyPlayerThinking = true;
            break;
        }
    }
    if (anyPlayerThinking) { // Still some players are thinking
        // console.log("anyPlayerThinking: " + anyPlayerThinking);
        return;
    }

    // No player is thinking
    m_userMgr.broadcastMsg("server_brc_nobody_thinking", {
        userId: game.seats[game.turn].userId,
    }, game.seats[game.turn].userId, true);

    // Determine next turn
    var nextTurnIndex = -1;
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        seat = game.seats[idxSeat];

        if ((seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) ||
            (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED)) {
            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;
        } else if ((seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING) ||
            (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_PONGING) ||
            (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONGING)) {
            var meld = {
                type: "",
                tiles: [],
            };

            // Copy lying tiles to meld
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "lying") {
                    meld.tiles.push(seat.handTiles[idxTile].tile);
                }
            }
            // Remove lying tiles from hand tiles
            for (var idxTile = seat.handTiles.length - 1; idxTile >= 0; idxTile--) {
                if (seat.handTiles[idxTile].pose == "lying") {
                    seat.handTiles.splice(idxTile, 1);
                }
            }

            // Steal tile from turn player, and move to meld
            var tileStealing = game.seats[game.turn].discardedTiles.pop();
            meld.tiles.push(tileStealing);

            // Push meld
            seat.melds.push(meld);

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

            nextTurnIndex = seat.seatIndex;
        }
    }

    if (nextTurnIndex == -1) {
        changeTurn(game);
        game.seats[game.turn].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_GET_TURN;
    } else {
        changeTurn(game, nextTurnIndex);
    }
    m_userMgr.broadcastMsg("server_brc_change_turn", game.seats[game.turn].userId, game.seats[game.turn].userId, true);

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_action_draw_tile = function (a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);

    var game = seat.game;

    if (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) {
        m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Draw Tile] on state: " + seat.fsmPlayerState);
        return;
    }

    doDrawTile(game);

    seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.on_client_req_action_backdraw_tile = function (a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);

    var game = seat.game;

    // if (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) {
    //     m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Backdraw Tile] on state: " + seat.fsmPlayerState);
    //     return;
    // }

    doBackdrawTile(game);

    // seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

exports.hasBegan = function (a_roomId) {
    var game = g_games[a_roomId];
    if (game != null) {
        return true;
    }
    var roomInfo = m_roomMgr.getRoomById(a_roomId);
    if (roomInfo != null) {
        return roomInfo.gameIndex > 0;
    }
    return false;
};


var g_dismissList = [];

exports.doDissolve = function (a_roomId) {
    var roomInfo = m_roomMgr.getRoomById(a_roomId);
    if (roomInfo == null) {
        return null;
    }

    var game = g_games[a_roomId];
    doGameOver(game, roomInfo.seats[0].userId, true);
};

exports.dissolveRequest = function (a_roomId, a_userId) {
    var roomInfo = m_roomMgr.getRoomById(a_roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dismissRequest != null) {
        return null;
    }

    var seatIndex = m_roomMgr.getSeatIndexByUserId(a_userId);
    if (seatIndex == null) {
        return null;
    }

    roomInfo.dismissRequest = {
        // endTime: Date.now() + 30000,
        endTime: Date.now() + 2000, // TOFIX: Temporarily change it to 2 seconds
        states: [false, false, false, false]
    };
    roomInfo.dismissRequest.states[seatIndex] = true;

    g_dismissList.push(a_roomId);

    return roomInfo;
};

exports.dissolveAgree = function (a_roomId, a_userId, a_agree) {
    var roomInfo = m_roomMgr.getRoomById(a_roomId);
    if (roomInfo == null) {
        return null;
    }

    if (roomInfo.dismissRequest == null) {
        return null;
    }

    var seatIndex = m_roomMgr.getSeatIndexByUserId(a_userId);
    if (seatIndex == null) {
        return null;
    }

    if (a_agree) {
        roomInfo.dismissRequest.states[seatIndex] = true;
    } else {
        roomInfo.dismissRequest = null;
        var idx = g_dismissList.indexOf(a_roomId);
        if (idx != -1) {
            g_dismissList.splice(idx, 1);
        }
    }
    return roomInfo;
};

function update() {
    for (var i = g_dismissList.length - 1; i >= 0; --i) {
        var roomId = g_dismissList[i];

        var roomInfo = m_roomMgr.getRoomById(roomId);
        if (roomInfo != null && roomInfo.dismissRequest != null) {
            if (Date.now() > roomInfo.dismissRequest.endTime) {
                console.log("delete room and games");
                exports.doDissolve(roomId);
                g_dismissList.splice(i, 1);
            }
        } else {
            g_dismissList.splice(i, 1);
        }
    }
}

// Let client update with this interval
setInterval(update, 1000);