cc.Class({
    extends: cc.Component,

    properties: {
        _imagePlayerIcon: null,
        _nodeDealer: null,
        _ready: null,
        _offline: null,
        _labelPlayerName: null,
        _labelPlayerScore: null,
        _scoreBg: null,
        _nddayingjia: null,
        _nodeVoiceMsg: null,

        _chatBubble: null,
        _emoji: null,
        _lastChatTime: -1,

        _userName: "",
        _score: 0,
        _dayingjia: false,
        _isOffline: false,
        _isReady: false,
        _isZhuang: false,
        _userId: null,
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }

        this._imagePlayerIcon = this.node.getChildByName("nodePlayerIcon").getComponent("ImageLoader");
        this._labelPlayerName = this.node.getChildByName("nodePlayerName").getComponent(cc.Label);
        this._labelPlayerScore = this.node.getChildByName("score").getComponent(cc.Label);
        this._nodeVoiceMsg = this.node.getChildByName("nodeVoiceMsg");

        if (this._nodeVoiceMsg) {
            this._nodeVoiceMsg.active = false;
        }

        if (this._imagePlayerIcon && this._imagePlayerIcon.getComponent(cc.Button)) {
            cc.vv.utils.addClickEvent(this._imagePlayerIcon, this.node, "Seat", "onIconClicked");
        }


        this._offline = this.node.getChildByName("nodeOffline");

        this._ready = this.node.getChildByName("ready");

        this._nodeDealer = this.node.getChildByName("nodeDealer");

        this._scoreBg = this.node.getChildByName("Z_money_frame");
        this._nddayingjia = this.node.getChildByName("dayingjia");

        this._chatBubble = this.node.getChildByName("nodeChatBubble");
        if (this._chatBubble != null) {
            this._chatBubble.active = false;
        }

        this._emoji = this.node.getChildByName("emoji");
        if (this._emoji != null) {
            this._emoji.active = false;
        }

        this.refresh();

        if (this._imagePlayerIcon && this._userId) {
            this._imagePlayerIcon.setUserID(this._userId);
        }
    },

    onIconClicked: function () {
        var iconSprite = this._imagePlayerIcon.node.getComponent(cc.Sprite);
        if (this._userId != null && this._userId > 0) {
            var seat = cc.vv.gameNetMgr.getSeatByID(this._userId);
            var sex = 0;
            if (cc.vv.baseInfoMap) {
                var info = cc.vv.baseInfoMap[this._userId];
                if (info) {
                    sex = info.sex;
                }
            }
            cc.vv.userinfoShow.show(seat.name, seat.userId, iconSprite, sex, seat.ip);
        }
    },

    refresh: function () {
        if (this._labelPlayerName != null) {
            this._labelPlayerName.string = this._userName;
        }

        if (this._labelPlayerScore != null) {
            // this._labelPlayerScore.string = this._score;
        }

        if (this._nddayingjia != null) {
            this._nddayingjia.active = this._dayingjia == true;
        }

        if (this._offline) {
            this._offline.active = this._isOffline && this._userName != "";
        }

        if (this._ready) {
            this._ready.active = this._isReady && (cc.vv.gameNetMgr.gameIndex > 0);
        }

        if (this._nodeDealer) {
            this._nodeDealer.active = this._isZhuang;
        }

        this.node.active = this._userName != null && this._userName != "";
    },

    setInfo(name, score, dayingjia) {
        this._userName = name;
        this._score = score;
        if (this._score == null) {
            this._score = 0;
        }
        this._dayingjia = dayingjia;

        if (this._scoreBg != null) {
            this._scoreBg.active = this._score != null;
        }

        if (this._labelPlayerScore != null) {
            this._labelPlayerScore.node.active = this._score != null;
        }

        this.refresh();
    },

    setDealer: function (value) {
        this._isZhuang = value;
        if (this._nodeDealer) {
            this._nodeDealer.active = value;
        }
    },

    setReady: function (isReady) {
        this._isReady = isReady;
        if (this._ready) {
            this._ready.active = this._isReady && (cc.vv.gameNetMgr.gameIndex > 0);
        }
    },

    setID: function (id) {
        var idNode = this.node.getChildByName("id");
        if (idNode) {
            var lbl = idNode.getComponent(cc.Label);
            lbl.string = "ID:" + id;
        }

        this._userId = id;
        if (this._imagePlayerIcon) {
            this._imagePlayerIcon.setUserID(id);
        }
    },

    setOffline: function (isOffline) {
        this._isOffline = isOffline;
        if (this._offline) {
            this._offline.active = this._isOffline && this._userName != "";
        }
    },

    chat: function (content) {
        if (this._chatBubble == null || this._emoji == null) {
            return;
        }
        this._emoji.active = false;
        this._chatBubble.active = true;
        this._chatBubble.getComponent(cc.Label).string = content;
        this._chatBubble.getChildByName("nodeChatBubbleLabel").getComponent(cc.Label).string = content;
        this._lastChatTime = 3;
    },

    emoji: function (emoji) {
        //emoji = JSON.parse(emoji);
        if (this._emoji == null || this._emoji == null) {
            return;
        }
        console.log(emoji);
        this._chatBubble.active = false;
        this._emoji.active = true;
        this._emoji.getComponent(cc.Animation).play(emoji);
        this._lastChatTime = 3;
    },

    voiceMsg: function (show) {
        if (this._nodeVoiceMsg) {
            this._nodeVoiceMsg.active = show;
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        if (this._lastChatTime > 0) {
            this._lastChatTime -= dt;
            if (this._lastChatTime < 0) {
                this._chatBubble.active = false;
                this._emoji.active = false;
                this._emoji.getComponent(cc.Animation).stop();
            }
        }
    },
});