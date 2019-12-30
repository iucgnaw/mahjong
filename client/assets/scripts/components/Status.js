cc.Class({
    extends: cc.Component,

    properties: {
        // foo: {
        //    default: null,      // The default value will be used only when the component attaching
        //                           to a node for the first time
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
        _status: null,
    },

    // use this for initialization
    start: function () {
        this._status = cc.find("Canvas/nodeStatus");

        this._colorRed = new cc.Color(205, 0, 0);
        this._colorGreen = new cc.Color(0, 205, 0);
        this._colorYellow = new cc.Color(255, 200, 0);
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        var nodeRtt = this._status.getChildByName("nodeRtt");
        if (cc.vv.net._timeRtt != null) {
            nodeRtt.getComponent(cc.Label).string = "RTT: " + cc.vv.net._timeRtt + "毫秒";
            if (cc.vv.net._timeRtt > 800) {
                nodeRtt.color = this._colorRed;
            } else if (cc.vv.net._timeRtt > 300) {
                nodeRtt.color = this._colorYellow;
            } else {
                nodeRtt.color = this._colorGreen;
            }
        } else {
            nodeRtt.getComponent(cc.Label).string = "RTT: N/A";
            nodeRtt.color = this._colorRed;
        }
    },
});