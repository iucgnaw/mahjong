cc.Class({
    extends: cc.Component,

    properties: {
        _nodeIndicator: null,
        _nodePointer: null,
        _labelCountdown: null,
        _time: -1,
        _alertTime: -1,
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

    // use this for initialization
    onLoad: function () {
        var nodeTable = this.node.getChildByName("nodeTable");
        this._nodeIndicator = nodeTable.getChildByName("nodeIndicator");
        this._nodePointer = this._nodeIndicator.getChildByName("nodePointer");
        this.initPointer();

        this._labelCountdown = this._nodeIndicator.getChildByName("nodeCountdown").getComponent(cc.Label);
        this._labelCountdown.string = "00";

        var self = this;

        this.node.on("event_server_brc_change_turn", function (data) {
            self.initPointer();
            self._time = 10;
            self._alertTime = 3;
        });
    },

    initPointer: function () {
        if (cc.vv == null) {
            return;
        }
        this._nodeIndicator.active = true;
        if (!this._nodeIndicator.active) {
            return;
        }
        var turnLocalIndex = cc.vv.gameNetMgr.getLocalIndex(cc.vv.gameNetMgr.turn);
        for (var i = 0; i < this._nodePointer.childrenCount; ++i) {
            this._nodePointer.children[i].active = (i == turnLocalIndex);
        }
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        if (this._time > 0) {
            this._time -= dt;
            if (this._alertTime > 0 && this._time < this._alertTime) {
                cc.vv.audioMgr.playSfx("alarm_timeup.mp3");
                this._alertTime = -1;
            }
            var pre = "";
            if (this._time < 0) {
                this._time = 0;
            }

            var t = Math.ceil(this._time);
            if (t < 10) {
                pre = "0";
            }
            this._labelCountdown.string = pre + t;
        }
    },
});