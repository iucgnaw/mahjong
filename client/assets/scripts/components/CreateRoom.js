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

        _gamelist: null,
        _currentGame: null,
    },

    // use this for initialization
    onLoad: function () {
        this._gamelist = this.node.getChildByName("game_list");
    },

    onBtnBack: function () {
        this.node.active = false;
    },

    onBtnOK: function () {
        this.node.active = false;
        this.createRoom();
    },

    getSelectedOfRadioGroup(groupRoot) {
        // console.log(groupRoot);
        var t = this._currentGame.getChildByName(groupRoot);

        var arr = [];
        for (var i = 0; i < t.childrenCount; ++i) {
            var n = t.children[i].getComponent("RadioButton");
            if (n != null) {
                arr.push(n);
            }
        }
        var selected = 0;
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i].checked) {
                selected = i;
                break;
            }
        }
        return selected;
    },

    createRoom: function () {
        var self = this;
        var onCreate = function (ret) {
            if (ret.errcode !== 0) {
                cc.vv.wc.hide();
                //console.error(ret.errmsg);
                if (ret.errcode == 2222) {
                    cc.vv.alert.show("提示", "钻石不足，创建房间失败!");
                } else {
                    cc.vv.alert.show("提示", "创建房间失败,错误码:" + ret.errcode);
                }
            } else {
                cc.vv.gameNetMgr.connectGameServer(ret);
            }
        };

        var roomConf = null;
        roomConf = this.constructRoomConf();
        roomConf.type = "xlch";

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            conf: JSON.stringify(roomConf)
        };
        // console.log(data);
        cc.vv.wc.show("正在创建房间");
        cc.vv.http.sendRequest("/create_private_room", data, onCreate);
    },

    constructRoomConf: function () {
        var wanfaxuanze = this._currentGame.getChildByName("wanfaxuanze"); //玩法
        var jushuxuanze = this.getSelectedOfRadioGroup("xuanzejushu"); //局数

        var roomConf = {
            jushuxuanze: jushuxuanze,
        };
        return roomConf;
    },


    // called every frame, uncomment this function to activate update callback
    update: function (dt) {
        var type = "xlch";
        if (this.lastType != type) {
            this.lastType = type;
            for (var i = 0; i < this._gamelist.childrenCount; ++i) {
                this._gamelist.children[i].active = false;
            }

            var game = this._gamelist.getChildByName(type);
            if (game) {
                game.active = true;
            }
            this._currentGame = game;
        }
    },
});