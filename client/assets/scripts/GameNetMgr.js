var m_mahjong = require("../../../common/mahjong.js");

cc.Class({
    extends: cc.Component,

    properties: {
        eventHandlerNode: null,

        roomId: null,
        maxHandCount: 0,
        gameIndex: 0,

        tilewallRemaining: 0,
        dealer: -1,
        turn: -1,
        seatIndex: -1,
        jokerTile: -1,

        seats: [],
        scoreBoard: [],

        isOver: false,
        dissoveData: null,
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },

    reset: function () {
        this.tilewallRemaining = 0;
        this.dealer = -1;
        this.turn = -1;
        this.jokerTile = m_mahjong.MJ_TILE_INVALID;
        this.fsmTableState = m_mahjong.MJ_TABLE_STATE_IDLE;

        for (var idxSeat = 0; idxSeat < this.seats.length; ++idxSeat) {
            this.seats[idxSeat].handTiles = [];
            this.seats[idxSeat].honorTiles = [];
            this.seats[idxSeat].discardedTiles = [];
            this.seats[idxSeat].melds = [];

            this.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;
            this.seats[idxSeat].score = 0;
        }
    },

    clear: function () {
        this.eventHandlerNode = null;
        if (this.isOver == null) {
            this.seats = null;
            this.roomId = null;
            this.maxHandCount = 0;
            this.gameIndex = 0;
        }
    },

    dispatchEvent(a_event, a_data) {
        if (this.eventHandlerNode) {
            this.eventHandlerNode.emit(a_event, a_data);
        }
    },

    getSeatIndexByUserId: function (a_userId) {
        for (var idxSeat = 0; idxSeat < this.seats.length; ++idxSeat) {
            var seat = this.seats[idxSeat];
            if (seat.userId == a_userId) {
                return idxSeat;
            }
        }
        return -1;
    },

    isTableOwner: function () {
        return this.seatIndex == 0;
    },

    getSeatByID: function (a_userId) {
        var seatIndex = this.getSeatIndexByUserId(a_userId);
        var seat = this.seats[seatIndex];
        return seat;
    },

    getSelfSeat: function () {
        return this.seats[this.seatIndex];
    },

    getLocalIndex: function (a_natualIndex) {
        var localIndex = (a_natualIndex - this.seatIndex + this.seats.length) % this.seats.length;
        return localIndex;
    },

    getNatualIndex: function (a_localIndex) {
        var natualIndex = (a_localIndex + this.seatIndex) % this.seats.length;
        return natualIndex;
    },

    prepareReplay: function (a_room, a_detailOfGame) {
        this.roomId = a_room.id;
        this.seats = a_room.seats;
        this.turn = a_detailOfGame.base_info.dealer;
        var baseInfo = a_detailOfGame.base_info;
        for (var idxSeat = 0; idxSeat < this.seats.length; ++idxSeat) {
            var seat = this.seats[idxSeat];
            seat.seatIndex = idxSeat;
            seat.score = 0;
            seat.handTiles = baseInfo.seats[idxSeat];
            seat.melds = [];
            seat.honorTiles = [];
            seat.discardedTiles = [];
            if (cc.vv.userMgr.userId == seat.userId) {
                this.seatIndex = idxSeat;
            }
        }
        this.conf = {
            type: baseInfo.type,
        }
        if (this.conf.type == null) {
            this.conf.type == "xlch";
        }
    },

    initHandlers: function () {
        var self = this;
        cc.vv.net.addHandler("server_resp_login_result", function (a_loginResult) {
            if (a_loginResult.errcode === 0) {
                var data = a_loginResult.data;
                self.roomId = data.roomId;
                self.conf = data.conf;
                self.maxHandCount = data.conf.maxHandCount;
                self.gameIndex = data.gameIndex;
                self.seats = data.seats;
                self.seatIndex = self.getSeatIndexByUserId(cc.vv.userMgr.userId);
                self.isOver = false;
            } else {
                console.error(a_loginResult.errmsg);
            }
        });

        cc.vv.net.addHandler("server_push_login_finished", function (data) {
            cc.director.loadScene("mjgame", function () {
                cc.vv.net.ping();
                cc.vv.wc.hide();
            });
            self.dispatchEvent("event_server_push_login_finished");
        });

        cc.vv.net.addHandler("server_push_exit_result", function (data) {
            self.roomId = null;
            self.turn = -1;
            self.seats = null;
        });

        cc.vv.net.addHandler("server_brc_player_exit", function (data) {
            var userId = data;
            var seat = self.getSeatByID(userId);
            if (seat != null) {
                seat.userId = 0;
                seat.name = "";
                self.dispatchEvent("event_update_seat_status", seat);
            }
        });

        cc.vv.net.addHandler("server_brc_dismiss_room", function (data) {
            self.roomId = null;
            self.turn = -1;
            self.seats = null;
        });

        cc.vv.net.addHandler("disconnect", function (data) {
            if (self.roomId == null) {
                cc.vv.wc.show("正在返回游戏大厅");
                cc.director.loadScene("hall");
            } else {
                if (self.isOver == false) {
                    cc.vv.userMgr.oldRoomId = self.roomId;
                    self.dispatchEvent("disconnect");
                } else {
                    self.roomId = null;
                }
            }
        });

        cc.vv.net.addHandler("server_brc_player_join", function (data) {
            var seatIndex = data.seatIndex;
            if (self.seats[seatIndex].userId > 0) {
                self.seats[seatIndex].online = true;
                if (self.seats[seatIndex].ip != data.ip) {
                    self.seats[seatIndex].ip = data.ip;
                }
            } else {
                data.online = true;
                self.seats[seatIndex] = data;
            }
            self.dispatchEvent("event_update_seat_status", self.seats[seatIndex]);
        });

        cc.vv.net.addHandler("server_brc_player_status_change", function (data) {
            var userId = data.userId;
            var seat = self.getSeatByID(userId);
            seat.online = data.online;
            self.dispatchEvent("event_update_seat_status", seat);
        });

        // TOFIX: can be deleted?
        // cc.vv.net.addHandler("server_brc_player_ready", function (data) {
        //     var userId = data.userId;
        //     var seat = self.getSeatByID(userId);
        //     self.dispatchEvent("event_update_seat_status", seat);
        // });

        cc.vv.net.addHandler("server_push_game_sync", function (a_gameForClient) {
            self.tilewallRemaining = a_gameForClient.tilewallRemaining;
            self.dealer = a_gameForClient.dealer;
            self.turn = a_gameForClient.turn;
            self.jokerTile = a_gameForClient.jokerTile;
            self.fsmTableState = a_gameForClient.fsmTableState;

            for (var idxSeat = 0; idxSeat < a_gameForClient.seats.length; ++idxSeat) {
                var gameSeatForClient = a_gameForClient.seats[idxSeat];

                self.seats[idxSeat].handTiles = gameSeatForClient.handTiles;
                self.seats[idxSeat].honorTiles = gameSeatForClient.honorTiles;
                self.seats[idxSeat].discardedTiles = gameSeatForClient.discardedTiles;
                self.seats[idxSeat].melds = gameSeatForClient.melds;

                self.seats[idxSeat].fsmPlayerState = gameSeatForClient.fsmPlayerState;
                self.seats[idxSeat].score = gameSeatForClient.score;
            }

            self.scoreBoard = a_gameForClient.scoreBoard;

            self.dispatchEvent("event_server_push_game_sync");
        });

        cc.vv.net.addHandler("server_push_message", function (data) {
            self.dispatchEvent("event_server_push_message", data);
        });

        cc.vv.net.addHandler("server_brc_change_turn", function (a_turnUserId) {
            var seatIndex = self.getSeatIndexByUserId(a_turnUserId);
            var previousAndNewTurn = {
                previousTurn: self.turn,
                turn: seatIndex,
            }
            self.turn = seatIndex;
            self.dispatchEvent("event_server_brc_change_turn", previousAndNewTurn);
        });

        cc.vv.net.addHandler("server_brc_hand_count", function (data) {
            self.gameIndex = data;
            self.dispatchEvent("event_server_brc_hand_count", data);
        });

        cc.vv.net.addHandler("server_brc_hand_end", function (a_endinfo) {
            self.dispatchEvent("event_server_brc_hand_end", null);

            // if (a_endinfo) {
            //     self.isOver = true;
            //     self.dispatchEvent("event_server_brc_match_end", a_endinfo);
            // }

            // self.reset();
            // for (var idxSeat = 0; idxSeat < self.seats.length; ++idxSeat) {
            //     self.dispatchEvent("event_update_seat_status", self.seats[idxSeat]);
            // }
        });

        cc.vv.net.addHandler("server_brc_action_discard", function (a_data) {
            var userId = a_data.userId;
            var tile = a_data.tile;
            var seatIndex = self.getSeatIndexByUserId(userId);
            self.on_server_brc_action_discard(seatIndex, tile);
        });

        cc.vv.net.addHandler("server_brc_action", function (a_msgData) {
            var seatIndex = self.getSeatIndexByUserId(a_msgData.userId);

            var eventData = {};
            eventData.seatIndex = seatIndex;
            eventData.action = a_msgData.action;
            self.dispatchEvent("event_server_brc_action", eventData);
        });

        cc.vv.net.addHandler("server_brc_propose_dismiss_room", function (data) {
            self.dissoveData = data;
            self.dispatchEvent("event_propose_dismiss_room", data);
        });

        cc.vv.net.addHandler("server_brc_reject_dismiss_room", function (data) {
            self.dissoveData = null;
            self.dispatchEvent("event_reject_dismiss_room", data);
        });
    },

    on_server_brc_action_discard: function (a_seatIndex, a_tile) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_action_discard", {
            seat: seat,
            tile: a_tile
        });
    },

    connectGameServer: function (a_data) {
        this.dissoveData = null;
        cc.vv.net.ip = a_data.ip + ":" + a_data.port;
        var self = this;

        var onConnectSucceeded = function () {
            var sd = {
                token: a_data.token,
                roomId: a_data.roomId,
                time: a_data.time,
                sign: a_data.sign,
            };
            cc.vv.net.send("client_req_login", sd);
        };

        var onConnectFailed = function () {
            console.error("Connect failed.");
            cc.vv.wc.hide();
        };

        cc.vv.wc.show("正在进入房间");
        cc.vv.net.connect(onConnectSucceeded, onConnectFailed);
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});