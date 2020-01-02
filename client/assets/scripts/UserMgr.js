cc.Class({
    extends: cc.Component,
    properties: {
        account: null,
        userId: null,
        userName: null,
        lv: 0,
        exp: 0,
        coins: 0,
        gems: 0,
        sign: 0,
        ip: "",
        sex: 0,
        roomData: null,

        oldRoomId: null,
    },

    guestAuth: function () {
        var account = cc.args["account"];
        if (account == null) {
            account = cc.sys.localStorage.getItem("account");
        }

        if (account == null) {
            account = Date.now();
            cc.sys.localStorage.setItem("account", account);
        }

        cc.vv.http.sendRequest("/guest", {
            account: account
        }, this.onAuth);
    },

    onAuth: function (a_ret) {
        var self = cc.vv.userMgr;
        if (a_ret.errcode !== 0) {
            console.log(a_ret.errmsg);
        } else {
            self.account = a_ret.account;
            self.sign = a_ret.sign;
            cc.vv.http.g_currentUrl = "http://" + cc.vv.serverInfo.hall;
            self.login();
        }
    },

    login: function () {
        var self = this;
        var onLogin = function (ret) {
            if (ret.errcode !== 0) {
                console.error(ret.errmsg);
            } else {
                if (!ret.userId) {
                    //jump to register user info.
                    cc.director.loadScene("createrole");
                } else {
                    // console.log(ret);
                    self.account = ret.account;
                    self.userId = ret.userId;
                    self.userName = ret.name;
                    self.lv = ret.lv;
                    self.exp = ret.exp;
                    self.coins = ret.coins;
                    self.gems = ret.gems;
                    self.roomData = ret.roomId;
                    self.sex = ret.sex;
                    self.ip = ret.ip;
                    cc.director.loadScene("hall");
                }
            }
        };
        cc.vv.wc.show("正在登录游戏");
        cc.vv.http.sendRequest("/login", {
            account: this.account,
            sign: this.sign
        }, onLogin);
    },

    create: function (name) {
        var self = this;
        var onCreate = function (ret) {
            if (ret.errcode !== 0) {
                console.error(ret.errmsg);
            } else {
                self.login();
            }
        };

        var data = {
            account: this.account,
            sign: this.sign,
            name: name
        };
        cc.vv.http.sendRequest("/create_user", data, onCreate);
    },

    enterRoom: function (roomId, callback) {
        var self = this;
        var onEnter = function (ret) {
            if (ret.errcode !== 0) {
                if (ret.errcode == -1) {
                    setTimeout(function () {
                        self.enterRoom(roomId, callback);
                    }, 5000);
                } else {
                    cc.vv.wc.hide();
                    if (callback != null) {
                        callback(ret);
                    }
                }
            } else {
                cc.vv.wc.hide();
                if (callback != null) {
                    callback(ret);
                }
                cc.vv.gameNetMgr.connectGameServer(ret);
            }
        };

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            roomId: roomId
        };
        cc.vv.wc.show("正在进入房间 " + roomId);
        cc.vv.http.sendRequest("/enter_private_room", data, onEnter);
    },
    getHistoryList: function (callback) {
        var self = this;
        var onGet = function (ret) {
            if (ret.errcode !== 0) {
                console.error(ret.errmsg);
            } else {
                console.log(ret.history);
                if (callback != null) {
                    callback(ret.history);
                }
            }
        };

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
        };
        cc.vv.http.sendRequest("/get_history_list", data, onGet);
    },
    getGamesOfRoom: function (uuid, callback) {
        var self = this;
        var onGet = function (ret) {
            if (ret.errcode !== 0) {
                console.error(ret.errmsg);
            } else {
                console.log(ret.data);
                callback(ret.data);
            }
        };

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            uuid: uuid,
        };
        cc.vv.http.sendRequest("/get_games_of_room", data, onGet);
    },

    getDetailOfGame: function (uuid, index, callback) {
        var self = this;
        var onGet = function (ret) {
            if (ret.errcode !== 0) {
                console.error(ret.errmsg);
            } else {
                console.log(ret.data);
                callback(ret.data);
            }
        };

        var data = {
            account: cc.vv.userMgr.account,
            sign: cc.vv.userMgr.sign,
            uuid: uuid,
            index: index,
        };
        cc.vv.http.sendRequest("/get_detail_of_game", data, onGet);
    }
});