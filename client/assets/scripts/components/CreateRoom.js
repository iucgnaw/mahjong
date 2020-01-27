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

    },

    // use this for initialization
    onLoad: function () {},

    onBtnBack: function () {
        this.node.active = false;
    },

    onBtnOK: function () {
        this.node.active = false;
        this.createRoom();
    },

    getRadioGroupSelection(a_nodeRadioGroup) {
        var selection = 0;

        for (var idxChild = 0; idxChild < a_nodeRadioGroup.childrenCount; idxChild++) {
            var nodeRadioButton = a_nodeRadioGroup.children[idxChild].getComponent("RadioButton");
            if (nodeRadioButton != null) {
                if (nodeRadioButton.checked) {
                    selection = idxChild;
                    break;
                }
            }
        }

        return selection;
    },

    createRoom: function () {
        var onCreate = function (a_ret) {
            if (a_ret.errcode !== 0) {
                cc.vv.wc.hide();
                if (a_ret.errcode == 2222) {
                    cc.vv.alert.show("提示", "钻石不足，创建房间失败!");
                } else {
                    cc.vv.alert.show("提示", "创建房间失败,错误码:" + a_ret.errcode);
                }
            } else {
                cc.vv.gameNetMgr.connectGameServer(a_ret);
            }
        };

        var roomConf = this.constructRoomConf();

        cc.vv.wc.show("正在创建房间");

        var queryAccountSignConf = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            conf: JSON.stringify(roomConf)
        };
        cc.vv.http.sendRequest("/create_private_room", queryAccountSignConf, onCreate);
    },

    constructRoomConf: function () {
        var nodePreference = this.node.getChildByName("nodePreference");
        var roomConf = {};

        var handNumSelection = this.getRadioGroupSelection(nodePreference.getChildByName("nodeRadioGroupHandNum"));
        roomConf.handNumSelection = handNumSelection;

        var playerNumSelection = this.getRadioGroupSelection(nodePreference.getChildByName("nodeRadioGroupPlayerNum"));
        switch (playerNumSelection) {
            case 0:
                roomConf.playerNum = 4;
                break;
            case 1:
                roomConf.playerNum = 3;
                break;
            case 2:
                roomConf.playerNum = 2;
                break;
            default:
                console.assert(false);
                break;
        }

        return roomConf;
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {},
});