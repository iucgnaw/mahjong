var m_mahjong = require("../../common/mahjong.js");
var m_roomMgr = require("./roommgr");
var m_userMgr = require("./usermgr");
var m_mjUtils = require("./mjutils");
var m_db = require("../utils/db");
var m_crypto = require("../utils/crypto");

var g_games = {};
var g_seatByUserId = {};

function copyGameForClient(a_gameForClient, a_game, a_userId) {
    a_gameForClient.tilewallRemaining = a_game.tilewall.length;
    a_gameForClient.dealer = a_game.dealer;
    a_gameForClient.turn = a_game.turn;
    a_gameForClient.jokerTile = a_game.jokerTile;
    a_gameForClient.fsmTableState = a_game.fsmTableState;

    a_gameForClient.seats = [];
    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        var seat = {};

        // seat.handTiles = a_game.seats[idxSeat].handTiles;
        seat.handTiles = JSON.parse(JSON.stringify(a_game.seats[idxSeat].handTiles));
        if (a_game.seats[idxSeat].userId != a_userId) { // Invalidize handTiles
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "standing") { // and only invalidize standing ones
                    seat.handTiles[idxTile].tile = m_mahjong.MJ_TILE_INVALID;
                }
            }
        }
        seat.honorTiles = a_game.seats[idxSeat].honorTiles;
        seat.discardedTiles = a_game.seats[idxSeat].discardedTiles;
        seat.melds = a_game.seats[idxSeat].melds;

        seat.fsmPlayerState = a_game.seats[idxSeat].fsmPlayerState;
        seat.score = a_game.seats[idxSeat].score;

        a_gameForClient.seats.push(seat);
    }
}

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
    var seatIndex = a_game.dealer;

    for (var idxRound = 0; idxRound < (a_game.seats.length * 3); ++idxRound) {
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);
        drawTile(a_game, seatIndex);

        // Move to next player
        seatIndex++;
        seatIndex %= a_game.seats.length;
    }
    // Each player draw 1 more tile (to get 13rd tile)
    for (var idxRound = 0; idxRound < a_game.seats.length; ++idxRound) {
        drawTile(a_game, seatIndex);

        // Move to next player
        seatIndex++;
        seatIndex %= a_game.seats.length;
    }
    // Dealer draw 1 more tile (to get 14th tile)
    drawTile(a_game, a_game.dealer);
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

    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        m_mahjong.sortHandTiles(a_game.seats[idxSeat].handTiles, a_game.jokerTile);
    }
}

function getNextSeatIndex(a_seatIndex, a_playerNum) {
    var nextSeatIndex = a_seatIndex + 1;
    nextSeatIndex %= a_playerNum;
    return nextSeatIndex;
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

    var results = [1, 1, 1, 1]; // TOFIX, [].length is wrong!!!
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
        var winnerSeatIndex = -1;
        for (idxSeat = 0; idxSeat < a_game.seats.length; idxSeat++) {
            if (a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_WON) {
                winnerSeatIndex = idxSeat;
            }
        }
        if (winnerSeatIndex != a_game.dealer) { // winner is not dealer, change dealer
            room.nextDealer = (a_game.dealer + 1) % a_game.seats.length;
        }
        m_db.update_next_dealer(roomId, room.nextDealer);

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
    }

    if (a_forceEnd || a_game == null) {
        fnNotifyResult(true);
    } else {
        fnNotifyResult(false);
        //保存游戏
        // store_game(a_game, function (a_ret) {
        //     m_db.update_game_result(room.uuid, a_game.gameIndex, dbResult);

        //     //保存游戏局数
        //     m_db.update_num_of_turns(roomId, room.gameIndex);

        //     //如果是第一次，则扣除房卡
        //     if (room.gameIndex == 1) {
        //         var cost = 2;
        //         if (room.conf.maxHandCount == 8) {
        //             cost = 3;
        //         }
        //         m_db.cost_gems(a_game.seats[0].userId, cost);
        //     }

        //     var isEnd = (room.gameIndex >= room.conf.maxHandCount);
        //     fnNotifyResult(isEnd);
        // });
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
        if (room.seats.length == room.conf.playerNum) {
            for (var idxSeat = 0; idxSeat < room.seats.length; ++idxSeat) {
                var gameSeat = room.seats[idxSeat];
                if (gameSeat.ready == false ||
                    m_userMgr.isOnline(gameSeat.userId) == false) {
                    return;
                }
            }

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

function store_history(a_room) {
    var seats = a_room.seats;
    var history = {
        uuid: a_room.uuid,
        id: a_room.id,
        time: a_room.createTime,
        seats: []
    };

    for (var idxSeat = 0; idxSeat < seats.length; ++idxSeat) {
        var seat = seats[idxSeat];
        var historySeat = history.seats[idxSeat] = {};
        historySeat.userId = seat.userId;
        historySeat.name = m_crypto.toBase64(seat.name);
        historySeat.score = seat.score;
    }

    for (var idxSeat = 0; idxSeat < seats.length; ++idxSeat) {
        var seat = seats[idxSeat];
        store_single_history(seat.userId, history);
    }
}

function construct_game_base_info(a_game) {
    var baseInfo = {
        type: a_game.conf.type,
        dealer: a_game.dealer,
        index: a_game.gameIndex,
        tilewall: a_game.tilewall,
        seats: []
    }
    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        baseInfo.seats[idxSeat] = a_game.seats[idxSeat].handTiles; // TOFIX, seats != seats[].handTiles
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

    var game = {
        conf: room.conf,
        room: room,
        gameIndex: room.gameIndex,

        dealer: room.nextDealer,

        tilewall: [],

        seats: [],

        turn: 0,

        jokerTile: m_mahjong.MJ_TILE_INVALID,

        fsmTableState: m_mahjong.MJ_TABLE_STATE_IDLE,
    };

    room.gameIndex++;

    for (var idxSeat = 0; idxSeat < room.seats.length; ++idxSeat) {
        var seat = game.seats[idxSeat] = {};

        seat.game = game;

        seat.seatIndex = idxSeat;

        seat.userId = room.seats[idxSeat].userId;
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

    game.fsmTableState = m_mahjong.MJ_TABLE_STATE_REPLACE_HONOR_TILES;
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var seat = game.seats[idxSeat];

        //TOFIX
        m_userMgr.sendMsg(seat.userId, "server_brc_hand_count", room.gameIndex);

        seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_INITIAL_WAITING;
    }
    construct_game_base_info(game);

    //通知玩家出牌方
    // m_userMgr.broadcastMsg("server_brc_change_turn", game.seats[game.turn].userId, game.seats[game.turn].userId, true);
    game.seats[game.turn].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING;

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
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_KONG_BACKDRAWING)) {
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

    m_mahjong.sortHandTiles(seat.handTiles, game.jokerTile);

    seat.discardedTiles.push(a_tile);

    // Notify all seats
    m_userMgr.broadcastMsg("server_brc_action_discard", {
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

exports.on_client_req_action = function (a_userId, a_action) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;

    switch (a_action) {
        case m_mahjong.MJ_ACTION_SET_ASIDE:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            // Validate selected tiles are honor tiles
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "selected") {
                    if (m_mahjong.getTileSuit(seat.handTiles[idxTile].tile) != m_mahjong.MJ_TILE_SUIT_HONOR) {
                        m_userMgr.sendMsg(a_userId, "server_push_message", "不能存非花牌！");
                        return;
                    } else {
                        if ((seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_FULL_HAND) &&
                            (idxTile != seat.handTiles.length - 1)) {
                            m_userMgr.sendMsg(a_userId, "server_push_message", "[" + seat.fsmPlayerState + "]状态，只能[" + a_action + "]摸上的牌");
                            return;
                        }
                    }
                }
            }

            // Copy selected tiles to honor tiles
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "selected") {
                    seat.honorTiles.push(seat.handTiles[idxTile].tile);
                }
            }
            // Remove selected tiles from hand tiles
            for (var idxTile = seat.handTiles.length - 1; idxTile >= 0; idxTile--) {
                if (seat.handTiles[idxTile].pose == "selected") {
                    seat.handTiles.splice(idxTile, 1);
                }
            }
            break;

        case m_mahjong.MJ_ACTION_BACKDRAW:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_KONG_BACKDRAWING)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Backdraw Tile] on state: " + seat.fsmPlayerState);
                return;
            }

            var maxHandTilesNum;
            if (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING) {
                if (seat.seatIndex == game.dealer) {
                    maxHandTilesNum = 14;
                } else {
                    maxHandTilesNum = 13;
                }
            } else {
                maxHandTilesNum = 14;
            }
            if ((seat.melds.length * 3 + seat.handTiles.length) >= maxHandTilesNum) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "已经补满牌！");
                return;
            }

            // Sort hand tiles
            m_mahjong.sortHandTiles(seat.handTiles, game.jokerTile);

            doBackdrawTile(game);

            if ((seat.melds.length * 3 + seat.handTiles.length) >= 14) {
                if ((seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING) ||
                    (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_FULL_HAND)) {
                    // Do nothing
                } else if (seat.fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONG_BACKDRAWING) {
                    seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;
                }
            }
            break;

        case m_mahjong.MJ_ACTION_DRAW:
            if (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Draw Tile] on state: " + seat.fsmPlayerState);
                return;
            }


            doDrawTile(game);

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;
            break;

        case m_mahjong.MJ_ACTION_CHOW:
            if (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }
            if (((game.turn + 1) % game.seats.length) != seat.seatIndex) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "只能[" + a_action + "]上家的出牌！");
                return;
            }

            // Change selected tiles to lying
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "selected") {
                    seat.handTiles[idxTile].pose = "lying";
                }
            }

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_CHOWING;
            for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) {
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

            // Change selected tiles to lying
            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                if (seat.handTiles[idxTile].pose == "selected") {
                    seat.handTiles[idxTile].pose = "lying";
                }
            }

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_PONGING;
            for (var i = 0; i < game.seats.length; ++i) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if ((game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) ||
                    (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) ||
                    (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING)) {
                    game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING;
                }
            }
            break;

        case m_mahjong.MJ_ACTION_KONG:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            if (seat.seatIndex == game.turn) { // Concealed Kong
                var meld = {
                    type: "",
                    tiles: [],
                };

                // Move lying tiles from hand tiles to meld
                for (var idxTile = seat.handTiles.length - 1; idxTile >= 0; idxTile--) {
                    if (seat.handTiles[idxTile].pose == "selected") {
                        meld.tiles.unshift(seat.handTiles[idxTile].tile);
                        seat.handTiles.splice(idxTile, 1);
                    }
                }
                meld.type = "meld_concealed_kong";
                seat.melds.push(meld);
                seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_KONG_BACKDRAWING;
            } else { // Exposed Kong or Pong to Kong
                // Change selected tiles to lying
                for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                    if (seat.handTiles[idxTile].pose == "selected") {
                        seat.handTiles[idxTile].pose = "lying";
                    }
                }

                seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_KONGING;
                for (var i = 0; i < game.seats.length; ++i) {
                    if (seat.seatIndex == idxSeat) {
                        continue;
                    }

                    if (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                        game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                    } else if ((game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) ||
                        (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) ||
                        (game.seats[i].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING)) {
                        game.seats[i].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING;
                    }
                }
            }
            break;

        case m_mahjong.MJ_ACTION_WIN:
            if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_GET_TURN) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_FULL_HAND) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING) &&
                (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_WINING)) {
                m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [" + a_action + "] on state: " + seat.fsmPlayerState);
                return;
            }

            seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_WINING;
            for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
                if (seat.seatIndex == idxSeat) {
                    continue;
                }

                if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED;
                } else if ((game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONGING) &&
                    (idxSeat == game.turn)) { // TOFIX 碰转杠才算被瞄上？
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_KONG_BEING_ROBBED;
                } else if ((game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_IDLE) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_PONGING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONGING)) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_THINKING_ON_WINING;
                }
            }

            for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
                seat.handTiles[idxTile].pose = "lying";
            }
            break;
    }

    // Tell clients
    var msgData = {};
    msgData.userId = seat.userId;
    msgData.action = a_action;
    m_userMgr.broadcastMsg("server_brc_action", msgData, seat.userId, true);

    switch (a_action) {
        case m_mahjong.MJ_ACTION_CHOW:
        case m_mahjong.MJ_ACTION_PONG:
        case m_mahjong.MJ_ACTION_KONG:
        case m_mahjong.MJ_ACTION_WIN:
        case m_mahjong.MJ_ACTION_PASS:
            determineNextTurn(a_userId);
            break;
    }

    // Sync game
    for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
        var gameForClient = {};
        copyGameForClient(gameForClient, game, game.seats[idxSeat].userId);
        m_userMgr.sendMsg(game.seats[idxSeat].userId, "server_push_game_sync", gameForClient);
    }
};

function isAnyPlayerThinking(a_game) {
    for (var idxSeat = 0; idxSeat < a_game.seats.length; ++idxSeat) {
        if ((a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) ||
            (a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) ||
            (a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING) ||
            (a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING) ||
            (a_game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_THINKING_ON_WINING)) {
            return (true);
        }
    }
    return false;
}

function determineNextTurn(a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;

    // Determine next turn
    var nextTurnIndex = -1;
    if (game.fsmTableState == m_mahjong.MJ_TABLE_STATE_REPLACE_HONOR_TILES) {
        if (seat.seatIndex == game.turn) { // Turn player finished replacing honor tiles
            var nextWaitingSeatIndex = -1;
            var curSeatIndex = seat.seatIndex;
            for (var seatCount = 0; seatCount < game.seats.length - 1; seatCount++) {
                var seatIndex = getNextSeatIndex(curSeatIndex, game.seats.length);
                if (game.seats[seatIndex].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_INITIAL_WAITING) {
                    nextWaitingSeatIndex = seatIndex;
                    break;
                }
                curSeatIndex = seatIndex;
            }

            if (nextWaitingSeatIndex != -1) {
                nextTurnIndex = nextWaitingSeatIndex;
                game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING;
            } else {
                game.fsmTableState = m_mahjong.MJ_TABLE_STATE_PLAYING;

                nextTurnIndex = game.dealer;
                game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;
            }
        } else { // Non-turn player passed, doesn't trigger changing turn
            // Do nothing
        }
    } else { // !(game.fsmTableState == m_mahjong.MJ_TABLE_STATE_REPLACE_HONOR_TILES)
        if (isAnyPlayerThinking(game)) {
            // Do nothing
        } else { // isAnyPlayerThinking() == false
            for (var idxSeat = 0; idxSeat < game.seats.length; ++idxSeat) {
                if ((game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_DISCARDING_TILE) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_BEING_TARGETED)) {
                    game.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;
                } else if ((game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_PONGING) ||
                    (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONGING)) {
                    var lyingTileNum = 0;
                    var lyingTile = m_mahjong.MJ_TILE_INVALID;
                    for (var idxTile = 0; idxTile < game.seats[idxSeat].handTiles.length; idxTile++) {
                        if (game.seats[idxSeat].handTiles[idxTile].pose == "lying") {
                            lyingTileNum++;
                            lyingTile = game.seats[idxSeat].handTiles[idxTile].tile; // Only store last lying tile
                        }
                    }

                    if ((lyingTileNum == 2) ||
                        (lyingTileNum == 3) ||
                        (lyingTileNum == 4)) {
                        var meld = {
                            type: "",
                            tiles: [],
                        };

                        // Move lying tiles from hand tiles to meld
                        for (var idxTile = game.seats[idxSeat].handTiles.length - 1; idxTile >= 0; idxTile--) {
                            if (game.seats[idxSeat].handTiles[idxTile].pose == "lying") {
                                meld.tiles.unshift(game.seats[idxSeat].handTiles[idxTile].tile);
                                game.seats[idxSeat].handTiles.splice(idxTile, 1);
                            }
                        }

                        if (game.seats[idxSeat].seatIndex == game.turn) {
                            meld.type = "meld_concealed_kong";
                        } else { // Stealing meld
                            // Steal tile from turn player, and move to meld
                            var stealingTile = game.seats[game.turn].discardedTiles.pop();
                            if (lyingTileNum == 2) {
                                if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_CHOWING) {
                                    meld.type = "meld_chow";
                                } else {
                                    meld.type = "meld_pong";
                                }
                            } else {
                                meld.type = "meld_exposed_kong";
                            }
                            meld.tiles.push(stealingTile);
                        }

                        game.seats[idxSeat].melds.push(meld);
                    } else {
                        var pongMeld = null;

                        for (idxMeld = 0; idxMeld < game.seats[idxSeat].melds.length; idxMeld++) {
                            if (game.seats[idxSeat].melds[idxMeld].type == "meld_pong") {
                                if (game.seats[idxSeat].melds[idxMeld].tiles[0] == lyingTile) {
                                    pongMeld = game.seats[idxSeat].melds[idxMeld];
                                    break;
                                }
                            }
                        }
                        if (pongMeld == null) {
                            pongMeld = game.seats[idxSeat].melds[0]; // TOFIX, may be already a Kong meld!!
                        }
                        // Move lying tiles from hand tiles to meld
                        for (var idxTile = game.seats[idxSeat].handTiles.length - 1; idxTile >= 0; idxTile--) {
                            if (game.seats[idxSeat].handTiles[idxTile].pose == "lying") {
                                pongMeld.tiles.push(game.seats[idxSeat].handTiles[idxTile].tile);
                                game.seats[idxSeat].handTiles.splice(idxTile, 1);
                            }
                        }
                        pongMeld.type = "meld_pong_to_kong";
                    }

                    nextTurnIndex = game.seats[idxSeat].seatIndex;
                    if (game.seats[nextTurnIndex].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONGING) {
                        game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_KONG_BACKDRAWING;
                    } else {
                        game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_FULL_HAND;
                    }
                } else if (game.seats[idxSeat].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_WINING) {
                    if (game.seats[idxSeat].seatIndex != game.turn) { // Stealing win
                        var handTile = {};
                        if (game.seats[game.turn].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_KONG_BEING_ROBBED) { // Steal the konging tile
                            // Move turn's lying tiles from hand tiles to winner's hand tiles
                            for (var idxTile = game.seats[game.turn].handTiles.length - 1; idxTile >= 0; idxTile--) {
                                if (game.seats[game.turn].handTiles[idxTile].pose == "lying") {
                                    handTile.tile = game.seats[game.turn].handTiles[idxTile].tile;
                                    game.seats[game.turn].handTiles.splice(idxTile, 1);
                                }
                            }
                        } else { // Steal the discarding tile
                            // Steal tile from turn player, and move to hand tiles
                            handTile.tile = game.seats[game.turn].discardedTiles.pop();
                        }
                        handTile.pose = "lying";
                        handTile.face = "front";
                        game.seats[idxSeat].handTiles.push(handTile);
                    }

                    // Change all seats' hand tiles to lying
                    // TOFIX make it a function to avoid idxSeat2
                    for (var idxSeat2 = 0; idxSeat2 < game.seats.length; ++idxSeat2) {
                        for (var idxTile = 0; idxTile < game.seats[idxSeat2].handTiles.length; idxTile++) {
                            game.seats[idxSeat2].handTiles[idxTile].pose = "lying";
                        }
                    }

                    nextTurnIndex = game.seats[idxSeat].seatIndex;
                    game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_WON;

                    game.fsmTableState = m_mahjong.MJ_TABLE_STATE_SCORING;

                    if (game.fsmTableState == m_mahjong.MJ_TABLE_STATE_SCORING) {
                        doGameOver(game, game.seats[nextTurnIndex].userId);
                    }
                }
            }

            if (nextTurnIndex == -1) { // No stealing of turn
                nextTurnIndex = getNextSeatIndex(game.turn, game.seats.length);
                game.seats[nextTurnIndex].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_GET_TURN;
            }
        }
    }
    if (nextTurnIndex != -1) {
        game.turn = nextTurnIndex;
        // TOFIX shall remove this message
        m_userMgr.broadcastMsg("server_brc_change_turn", game.seats[game.turn].userId, game.seats[game.turn].userId, true);
    }
}

exports.on_client_req_action_pass = function (a_userId) {
    var seat = g_seatByUserId[a_userId];
    console.assert(seat != null);
    var game = seat.game;

    if ((seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_INITIAL_WAITING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_INITIAL_REPLACING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_CHOWING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_PONGING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_KONGING) &&
        (seat.fsmPlayerState != m_mahjong.MJ_PLAYER_STATE_THINKING_ON_WINING)) {
        m_userMgr.sendMsg(a_userId, "server_push_message", "Can't [Pass] on state: " + seat.fsmPlayerState);
        return;
    }

    // Sort hand tiles
    m_mahjong.sortHandTiles(seat.handTiles, game.jokerTile);

    // Tell everyone
    m_userMgr.broadcastMsg("server_brc_player_pass", {
        userId: seat.userId
    }, seat.userId, true);
    seat.fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;

    determineNextTurn(a_userId);

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
    var room = m_roomMgr.getRoomById(a_roomId);
    if (room == null) {
        return null;
    }

    var game = g_games[a_roomId];
    doGameOver(game, room.seats[0].userId, true);
};

exports.dissolveRequest = function (a_roomId, a_userId) {
    var room = m_roomMgr.getRoomById(a_roomId);
    if (room == null) {
        return null;
    }
    if (room.dismissRequest != null) {
        return null;
    }
    var seatIndex = m_roomMgr.getSeatIndexByUserId(a_userId);
    if (seatIndex == null) {
        return null;
    }

    room.dismissRequest = {
        // endTime: Date.now() + 30000,
        endTime: Date.now() + 10000, // TOFIX: Temporarily change the time
        states: []
    };
    for (var idxSeat = 0; idxSeat < room.seats.length; idxSeat++) {
        room.dismissRequest.states.push(false);
    }
    room.dismissRequest.states[seatIndex] = true;

    g_dismissList.push(a_roomId);

    return room;
};

exports.dissolveAgree = function (a_roomId, a_userId, a_agree) {
    var room = m_roomMgr.getRoomById(a_roomId);
    if (room == null) {
        return null;
    }
    if (room.dismissRequest == null) {
        return null;
    }
    var seatIndex = m_roomMgr.getSeatIndexByUserId(a_userId);
    if (seatIndex == null) {
        return null;
    }

    if (a_agree) {
        room.dismissRequest.states[seatIndex] = true;
    } else {
        room.dismissRequest = null;
        var idx = g_dismissList.indexOf(a_roomId);
        if (idx != -1) {
            g_dismissList.splice(idx, 1);
        }
    }
    return room;
};

function update() {
    for (var i = g_dismissList.length - 1; i >= 0; --i) {
        var roomId = g_dismissList[i];

        var roomInfo = m_roomMgr.getRoomById(roomId);
        if (roomInfo != null && roomInfo.dismissRequest != null) {
            if (Date.now() > roomInfo.dismissRequest.endTime) {
                // console.log("delete room and games");
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