cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _isGameEnd: false,
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }
        if (cc.vv.gameNetMgr.conf == null) {
            return;
        }
        this.node.getChildByName("nodeScoring").active = false;

        var self = this;
        this.node.on("event_server_brc_hand_end", function (a_data) {
            self.onGameOver(a_data);
        });

        this.node.on("event_server_brc_match_end", function (a_data) {
            self._isGameEnd = true;
        });
    },

    onGameOver: function (a_data) {
        if (a_data.length == 0) {
            this.node.getChildByName("nodeGameResult").active = true;
            return;
        }
        this.node.getChildByName("nodeScoring").active = true;
    },

    onBtnReadyClicked: function () {
        if (this._isGameEnd) {
            this.node.getChildByName("nodeGameResult").active = true;
        } else {
            cc.vv.net.send("client_req_prepared");
        }
        this.node.getChildByName("nodeScoring").active = false;
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {},
});