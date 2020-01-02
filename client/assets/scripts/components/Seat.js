cc.Class({
    extends: cc.Component,

    properties: {
        _scriptImageLoder: null,
        _nodeDealer: null,
        _nodeOffline: null,
        _labelPlayerName: null,
        _labelPlayerScore: null,

        _userId: null,
        _userName: "",
        _score: 0,
        _isDealer: false,
        _isOffline: false,
        _userId: null,
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }

        this._scriptImageLoder = this.node.getChildByName("nodePlayerIcon").getComponent("ImageLoader");
        this._labelPlayerName = this.node.getChildByName("nodePlayerName").getComponent(cc.Label);
        this._labelPlayerScore = this.node.getChildByName("score").getComponent(cc.Label);
        this._nodeOffline = this.node.getChildByName("nodeOffline");
        this._nodeDealer = this.node.getChildByName("nodeDealer");

        this.refresh();

        if (this._scriptImageLoder && this._userId) {
            this._scriptImageLoder.setUserID(this._userId);
        }
    },

    refresh: function () {
        if (this._labelPlayerName != null) {
            this._labelPlayerName.string = this._userName;
        }

        if (this._labelPlayerScore != null) {
            // this._labelPlayerScore.string = this._score;
        }

        if (this._nodeOffline) {
            this._nodeOffline.active = this._isOffline && this._userName != "";
        }

        if (this._nodeDealer) {
            this._nodeDealer.active = this._isDealer;
        }

        // this.node.active = this._userName != null && this._userName != "";
    },

    setUser_Name_Score: function (a_userName, a_score) {
        this._userName = a_userName;
        this._score = a_score;
        if (this._score == null) {
            this._score = 0;
        }

        if (this._labelPlayerScore != null) {
            this._labelPlayerScore.node.active = this._score != null;
        }

        this.refresh();
    },

    setDealer: function (a_isDealer) {
        this._isDealer = a_isDealer;
        if (this._nodeDealer) {
            this._nodeDealer.active = a_isDealer;
        }
    },

    setUser_Id_Image: function (a_userId) {
        var nodeUserId = this.node.getChildByName("id");
        if (nodeUserId) {
            var labelUserId = nodeUserId.getComponent(cc.Label);
            labelUserId.string = "ID:" + a_userId;
        }

        this._userId = a_userId;
        if (this._scriptImageLoder) {
            this._scriptImageLoder.setUserID(a_userId);
        }
    },

    setOffline: function (a_isOffline) {
        this._isOffline = a_isOffline;
        if (this._nodeOffline) {
            this._nodeOffline.active = this._isOffline && this._userName != "";
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {},
});