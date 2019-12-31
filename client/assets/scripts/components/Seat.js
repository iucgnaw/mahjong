cc.Class({
    extends: cc.Component,

    properties: {
        _imagePlayerIcon: null,
        _nodeDealer: null,
        _offline: null,
        _labelPlayerName: null,
        _labelPlayerScore: null,
        _nddayingjia: null,

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

        if (this._imagePlayerIcon && this._imagePlayerIcon.getComponent(cc.Button)) {
            cc.vv.utils.addClickEvent(this._imagePlayerIcon, this.node, "Seat", "onIconClicked");
        }

        this._offline = this.node.getChildByName("nodeOffline");

        this._nodeDealer = this.node.getChildByName("nodeDealer");

        this._nddayingjia = this.node.getChildByName("dayingjia");

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

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
    },
});