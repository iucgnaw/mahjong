var m_mahjong = require("../../../common/mahjong.js");

cc.Class({
    extends: cc.Component,

    properties: {
        dataEventHandler: null,
        roomId: null,
        maxHandCount: 0,
        gameIndex: 0,
        tilewallRemaining: 0,
        seatIndex: -1,
        seats: null,
        turn: -1,
        jokerTile: m_mahjong.MJ_TILE_INVALID,
        dealer: -1,

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
        this.turn = -1;
        this.dealer = -1;
        this.fsmTableState = m_mahjong.MJ_TABLE_STATE_IDLE;
        for (var idxSeat = 0; idxSeat < this.seats.length; ++idxSeat) {
            this.seats[idxSeat].handTiles = [];
            this.seats[idxSeat].honorTiles = [];
            this.seats[idxSeat].discardedTiles = [];
            this.seats[idxSeat].melds = [];
            this.seats[idxSeat].ready = false;
            this.seats[idxSeat].fsmPlayerState = m_mahjong.MJ_PLAYER_STATE_IDLE;
        }
    },

    clear: function () {
        this.dataEventHandler = null;
        if (this.isOver == null) {
            this.seats = null;
            this.roomId = null;
            this.maxHandCount = 0;
            this.gameIndex = 0;
        }
    },

    dispatchEvent(a_event, a_data) {
        if (this.dataEventHandler) {
            this.dataEventHandler.emit(a_event, a_data);
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
        var localIndex = (a_natualIndex - this.seatIndex + 4) % 4;
        return localIndex;
    },

    getNatualIndex: function (a_localIndex) {
        var natualIndex = (a_localIndex + this.seatIndex) % 4;
        return natualIndex;
    },

    prepareReplay: function (a_room, a_detailOfGame) {
        this.roomId = a_room.id;
        this.seats = a_room.seats;
        this.turn = a_detailOfGame.base_info.dealer;
        var baseInfo = a_detailOfGame.base_info;
        for (var i = 0; i < this.seats.length; ++i) {
            var seat = this.seats[i];
            seat.seatIndex = i;
            seat.score = null;
            seat.handTiles = baseInfo.seats[i];
            seat.melds = [];
            seat.honorTiles = [];
            seat.discardedTiles = [];
            if (cc.vv.userMgr.userId == seat.userId) {
                this.seatIndex = i;
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

        cc.vv.net.addHandler("server_brc_player_ready", function (data) {
            var userId = data.userId;
            var seat = self.getSeatByID(userId);
            seat.ready = data.ready;
            self.dispatchEvent("event_update_seat_status", seat);
        });

        cc.vv.net.addHandler("server_push_game_sync", function (a_data) {
            self.tilewallRemaining = a_data.tilewallRemaining;
            self.dealer = a_data.dealer;
            self.turn = a_data.turn;
            self.jokerTile = a_data.jokerTile;
            self.fsmTableState = a_data.fsmTableState;

            for (var i = 0; i < a_data.seats.length; ++i) {
                var seat = self.seats[i];
                var dataSeat = a_data.seats[i];

                seat.handTiles = dataSeat.handTiles;
                seat.honorTiles = dataSeat.honorTiles;
                seat.discardedTiles = dataSeat.discardedTiles;
                seat.melds = dataSeat.melds;

                seat.fsmPlayerState = dataSeat.fsmPlayerState;
                seat.score = dataSeat.score;
            }
            self.dispatchEvent("event_server_push_game_sync");
        });

        cc.vv.net.addHandler("server_push_message", function (data) {
            self.dispatchEvent("event_server_push_message", data);
        });

        cc.vv.net.addHandler("server_brc_change_turn", function (data) {
            var turnUserID = data;
            var seatIndex = self.getSeatIndexByUserId(turnUserID);
            self.doChangeTurn(seatIndex);
        });

        cc.vv.net.addHandler("server_brc_hand_count", function (data) {
            self.gameIndex = data;
            self.dispatchEvent("event_server_brc_hand_count", data);
        });

        cc.vv.net.addHandler("server_brc_hand_end", function (data) {
            var results = data.results;
            for (var i = 0; i < self.seats.length; ++i) {
                self.seats[i].score = results.length == 0 ? 0 : results[i].totalscore;
            }
            self.dispatchEvent("event_server_brc_hand_end", results);
            if (data.endinfo) {
                self.isOver = true;
                self.dispatchEvent("event_server_brc_match_end", data.endinfo);
            }

            self.reset();
            for (var i = 0; i < self.seats.length; ++i) {
                self.dispatchEvent("event_update_seat_status", self.seats[i]);
            }
        });

        cc.vv.net.addHandler("server_brc_discarding_tile", function (a_data) {
            var userId = a_data.userId;
            var tile = a_data.tile;
            var seatIndex = self.getSeatIndexByUserId(userId);
            self.on_server_brc_discarding_tile(seatIndex, tile);
        });

        cc.vv.net.addHandler("server_brc_player_pass", function (data) {
            var userId = data.userId;
            var seatIndex = self.getSeatIndexByUserId(userId);
            self.on_server_brc_player_pass(seatIndex);
        });

        cc.vv.net.addHandler("server_brc_nobody_thinking", function (a_data) {
            var userId = a_data.userId;
            var tile = a_data.tile;
            var seatIndex = self.getSeatIndexByUserId(userId);
            self.on_server_brc_nobody_thinking(seatIndex, tile);
        });

        cc.vv.net.addHandler("server_brc_set_aside", function (a_data) {
            var seatIndex = self.getSeatIndexByUserId(a_data);
            self.on_server_brc_set_aside(seatIndex, null);
        });

        cc.vv.net.addHandler("server_brc_chowing", function (a_data) {
            var seatIndex = self.getSeatIndexByUserId(a_data);
            self.on_server_brc_chowing(seatIndex, null);
        });

        cc.vv.net.addHandler("server_brc_ponging", function (a_data) {
            var seatIndex = self.getSeatIndexByUserId(a_data);
            self.on_server_brc_ponging(seatIndex, null);
        });

        cc.vv.net.addHandler("server_brc_konging", function (a_data) {
            var seatIndex = self.getSeatIndexByUserId(a_data);

            self.on_server_brc_konging(seatIndex, null);
        });

        cc.vv.net.addHandler("server_brc_winning", function (a_userId) {
            var seatIndex = self.getSeatIndexByUserId(a_userId);
            var seat = self.seats[seatIndex];

            self.dispatchEvent("event_server_brc_winning", seat);
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

    on_server_brc_player_pass: function (a_seatIndex) {
        var seat = this.seats[a_seatIndex];
        this.dispatchEvent("event_server_brc_player_pass", seat);
    },

    // TOFIX: Seems can be deleted.
    on_server_brc_nobody_thinking: function (seatIndex, tile) {
        var seat = this.seats[seatIndex];
        seat.discardedTiles.push(tile);
    },

    on_server_brc_discarding_tile: function (a_seatIndex, a_tile) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_discarding_tile", {
            seat: seat,
            tile: a_tile
        });
    },

    on_server_brc_set_aside: function (a_seatIndex, a_data) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_set_aside", seat);
    },

    on_server_brc_chowing: function (a_seatIndex, a_data) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_chowing", seat);
    },

    on_server_brc_ponging: function (a_seatIndex, a_data) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_ponging", seat);
    },

    on_server_brc_konging: function (a_seatIndex, a_data) {
        var seat = this.seats[a_seatIndex];

        this.dispatchEvent("event_server_brc_konging", seat);
    },

    doChangeTurn: function (a_seatIndex) {
        var previousAndNewTurn = {
            previousTurn: this.turn,
            turn: a_seatIndex,
        }
        this.turn = a_seatIndex;
        this.dispatchEvent("event_server_brc_change_turn", previousAndNewTurn);
    },

    connectGameServer: function (data) {
        this.dissoveData = null;
        cc.vv.net.ip = data.ip + ":" + data.port;
        var self = this;

        var onConnectSucceeded = function () {
            var sd = {
                token: data.token,
                roomId: data.roomId,
                time: data.time,
                sign: data.sign,
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