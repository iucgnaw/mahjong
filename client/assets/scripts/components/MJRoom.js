cc.Class({
    extends: cc.Component,

    properties: {
        _labelRoomNum: {
            default: null,
            type: cc.Label
        },
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _scriptPrepareSeats: [],
        _scriptTableSeats: [],
        _labelTime: null,
        _voiceMsgQueue: [],
        _lastPlayingSeat: null,
        _playingSeat: null,
        _lastPlayTime: null,
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }

        this.initView();
        this.initSeats();
        this.initEventHandlers();
    },

    initView: function () {
        var nodePrepare = this.node.getChildByName("nodePrepare");
        var nodeSeats = nodePrepare.getChildByName("nodeSeats");
        for (var i = 0; i < nodeSeats.childrenCount; ++i) {
            this._scriptPrepareSeats.push(nodeSeats.children[i].getComponent("Seat"));
        }

        this.refreshBtns();

        // this._labelRoomNum = cc.find("Canvas/nodeInfo/nodeRoom/nodeRoomNum").getComponent(cc.Label);
        // this._labelRoomNum.string = cc.vv.gameNetMgr.roomId;

        // this._labelTime = cc.find("Canvas/nodeInfo/nodeTime").getComponent(cc.Label);
        var nodeGame = this.node.getChildByName("nodeTable");
        var sideStrings = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        for (var i = 0; i < sideStrings.length; ++i) {
            var nodeSide = nodeGame.getChildByName(sideStrings[i]);
            var nodeSeat = nodeSide.getChildByName("nodeSeat");
            this._scriptTableSeats.push(nodeSeat.getComponent("Seat"));
        }

        var btnWechat = cc.find("Canvas/prepare/btnWeichat");
        if (btnWechat) {
            cc.vv.utils.addClickEvent(btnWechat, this.node, "MJRoom", "onBtnWeichatClicked");
        }
    },

    refreshBtns: function () {
        var nodePrepare = this.node.getChildByName("nodePrepare");
        var btnExit = nodePrepare.getChildByName("btnExit");
        var btnDispress = nodePrepare.getChildByName("btnDissolve");
        var btnWeichat = nodePrepare.getChildByName("btnWeichat");
        var isIdle = cc.vv.gameNetMgr.gameIndex == 0;

        btnExit.active = !cc.vv.gameNetMgr.isTableOwner() && isIdle;
        btnDispress.active = cc.vv.gameNetMgr.isTableOwner() && isIdle;

        btnWeichat.active = isIdle;
    },

    initEventHandlers: function () {
        var self = this;
        this.node.on("event_player_join", function (data) {
            self.initSingleSeat(data);
        });

        this.node.on("event_seat_update", function (data) {
            self.initSingleSeat(data);
        });

        this.node.on("event_server_brc_hand_count", function (data) {
            self.refreshBtns();
        });

        this.node.on("event_voice_message", function (data) {
            self._voiceMsgQueue.push(data);
            self.playVoice();
        });

        this.node.on("event_chat", function (data) {
            var idx = cc.vv.gameNetMgr.getSeatIndexByUserId(data.sender);
            var localIdx = cc.vv.gameNetMgr.getLocalIndex(idx);
            self._scriptPrepareSeats[localIdx].chat(data.content);
            self._scriptTableSeats[localIdx].chat(data.content);
        });

        this.node.on("event_quick_chat", function (data) {
            var idx = cc.vv.gameNetMgr.getSeatIndexByUserId(data.sender);
            var localIdx = cc.vv.gameNetMgr.getLocalIndex(idx);

            var index = data.content;
            var info = cc.vv.chat.getQuickChatInfo(index);
            self._scriptPrepareSeats[localIdx].chat(info.content);
            self._scriptTableSeats[localIdx].chat(info.content);

            cc.vv.audioMgr.playSfx(info.sound);
        });

        this.node.on("event_emoji", function (data) {
            var idx = cc.vv.gameNetMgr.getSeatIndexByUserId(data.sender);
            var localIdx = cc.vv.gameNetMgr.getLocalIndex(idx);
            console.log(data);
            self._scriptPrepareSeats[localIdx].emoji(data.content);
            self._scriptTableSeats[localIdx].emoji(data.content);
        });
    },

    initSeats: function () {
        var seats = cc.vv.gameNetMgr.seats;
        for (var i = 0; i < seats.length; ++i) {
            this.initSingleSeat(seats[i]);
        }
    },

    initSingleSeat: function (a_seat) {
        var localIndex = cc.vv.gameNetMgr.getLocalIndex(a_seat.seatIndex);
        var isOffline = !a_seat.online;
        var isZhuang = a_seat.seatIndex == cc.vv.gameNetMgr.dealer;

        // console.log("isOffline:" + isOffline);

        this._scriptPrepareSeats[localIndex].setInfo(a_seat.name, a_seat.score);
        this._scriptPrepareSeats[localIndex].setReady(a_seat.ready);
        this._scriptPrepareSeats[localIndex].setOffline(isOffline);
        this._scriptPrepareSeats[localIndex].setID(a_seat.userId);
        this._scriptPrepareSeats[localIndex].voiceMsg(false);

        this._scriptTableSeats[localIndex].setInfo(a_seat.name, a_seat.score);
        this._scriptTableSeats[localIndex].setDealer(isZhuang);
        this._scriptTableSeats[localIndex].setOffline(isOffline);
        this._scriptTableSeats[localIndex].setID(a_seat.userId);
        this._scriptTableSeats[localIndex].voiceMsg(false);
    },

    onBtnSettingsClicked: function () {
        cc.vv.popupMgr.showSettings();
    },

    onBtnBackClicked: function () {
        cc.vv.alert.show("返回大厅", "返回大厅房间仍会保留，快去邀请大伙来玩吧！", function () {
            cc.vv.wc.show("正在返回游戏大厅");
            cc.director.loadScene("hall");
        }, true);
    },

    onBtnChatClicked: function () {

    },

    onBtnWeichatClicked: function () {
        var title = "<麻将>";
        cc.vv.anysdkMgr.share("麻将" + title, "房号:" + cc.vv.gameNetMgr.roomId);
    },

    onBtnDissolveClicked: function () {
        cc.vv.alert.show("解散房间", "解散房间不扣房卡，是否确定解散？", function () {
            cc.vv.net.send("client_req_close_room");
        }, true);
    },

    onBtnExit: function () {
        cc.vv.net.send("client_req_exit_room");
    },

    playVoice: function () {
        if (this._playingSeat == null && this._voiceMsgQueue.length) {
            console.log("playVoice2");
            var data = this._voiceMsgQueue.shift();
            var idx = cc.vv.gameNetMgr.getSeatIndexByUserId(data.sender);
            var localIndex = cc.vv.gameNetMgr.getLocalIndex(idx);
            this._playingSeat = localIndex;
            this._scriptPrepareSeats[localIndex].voiceMsg(true);
            this._scriptTableSeats[localIndex].voiceMsg(true);

            var msgInfo = JSON.parse(data.content);

            var msgfile = "voicemsg.amr";
            console.log(msgInfo.msg.length);
            cc.vv.voiceMgr.writeVoice(msgfile, msgInfo.msg);
            cc.vv.voiceMgr.play(msgfile);
            this._lastPlayTime = Date.now() + msgInfo.time;
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        // var minutes = Math.floor(Date.now() / 1000 / 60);
        // if (this._lastMinute != minutes) {
        //     this._lastMinute = minutes;
        //     var date = new Date();
        //     var h = date.getHours();
        //     h = h < 10 ? "0" + h : h;

        //     var m = date.getMinutes();
        //     m = m < 10 ? "0" + m : m;
        //     this._labelTime.string = "" + h + ":" + m;
        // }


        if (this._lastPlayTime != null) {
            if (Date.now() > this._lastPlayTime + 200) {
                this.onPlayerOver();
                this._lastPlayTime = null;
            }
        } else {
            this.playVoice();
        }
    },


    onPlayerOver: function () {
        cc.vv.audioMgr.resumeAll();
        console.log("onPlayCallback:" + this._playingSeat);
        var localIndex = this._playingSeat;
        this._playingSeat = null;
        this._scriptPrepareSeats[localIndex].voiceMsg(false);
        this._scriptTableSeats[localIndex].voiceMsg(false);
    },

    onDestroy: function () {
        cc.vv.voiceMgr.stop();
        //        cc.vv.voiceMgr.onPlayCallback = null;
    }
});