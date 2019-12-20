function urlParse() {
    var params = {};
    if (window.location == null) {
        return params;
    }
    var name, value;
    var str = window.location.href; //取得整个地址栏
    var num = str.indexOf("?")
    str = str.substr(num + 1); //取得所有参数   stringvar.substr(start [, length ]

    var arr = str.split("&"); //各个参数放到数组里
    for (var i = 0; i < arr.length; i++) {
        num = arr[i].indexOf("=");
        if (num > 0) {
            name = arr[i].substring(0, num);
            value = arr[i].substr(num + 1);
            params[name] = value;
        }
    }
    return params;
}

function initMgr() {
    cc.vv = {}; // Create cc.vv namespace

    var UserMgr = require("UserMgr");
    cc.vv.userMgr = new UserMgr();

    var ReplayMgr = require("ReplayMgr");
    cc.vv.replayMgr = new ReplayMgr();

    cc.vv.http = require("HTTP");
    cc.vv.global = require("Global");
    cc.vv.net = require("Net");

    var GameNetMgr = require("GameNetMgr");
    cc.vv.gameNetMgr = new GameNetMgr();
    cc.vv.gameNetMgr.initHandlers();

    var AnysdkMgr = require("AnysdkMgr");
    cc.vv.anysdkMgr = new AnysdkMgr();
    cc.vv.anysdkMgr.init();

    var VoiceMgr = require("VoiceMgr");
    cc.vv.voiceMgr = new VoiceMgr();
    cc.vv.voiceMgr.init();

    var AudioMgr = require("AudioMgr");
    cc.vv.audioMgr = new AudioMgr();
    cc.vv.audioMgr.init();

    var Utils = require("Utils");
    cc.vv.utils = new Utils();

    //var MJUtil = require("MJUtil");
    //cc.vv.mjutil = new MJUtil();

    cc.args = urlParse();
}



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
        labelLog: {
            default: null,
            type: cc.Label
        },

        labelLoadingProgess: cc.Label,
    },

    // use this for initialization
    onLoad: function () {
        initMgr();
        cc.vv.utils.fitCanvasWithFrame();
        // console.log("haha");
        this._mainScene = "loading";
        this.showSplash(function () {
            this.getServerInfo();
        }.bind(this));
    },

    onBtnDownloadClicked: function () {
        cc.sys.openURL(cc.vv.serverInfo.appweb);
    },

    showSplash: function (a_fnAfterSplash) {
        var self = this;
        var SHOW_TIME = 1000;
        var FADE_TIME = 200;
        this._splash = cc.find("Canvas/splash");
        if (true || cc.sys.os != cc.sys.OS_IOS || !cc.sys.isNative) {
            this._splash.active = true;
            if (this._splash.getComponent(cc.Sprite).spriteFrame == null) {
                a_fnAfterSplash();
                return;
            }
            var time = Date.now();
            var fnTimeout = function () {
                var timeDiff = Date.now() - time;
                if (timeDiff < SHOW_TIME) {
                    setTimeout(fnTimeout, 33);
                } else {
                    var opacity = (1 - ((timeDiff - SHOW_TIME) / FADE_TIME)) * 255;
                    if (opacity < 0) {
                        self._splash.opacity = 0;
                        a_fnAfterSplash();
                    } else {
                        self._splash.opacity = opacity;
                        setTimeout(fnTimeout, 33);
                    }
                }
            };
            setTimeout(fnTimeout, 33);
        } else {
            this._splash.active = false;
            a_fnAfterSplash();
        }
    },

    getServerInfo: function () {
        var self = this;
        var fnGetVersion = function (a_serverInfo) {
            cc.vv.serverInfo = a_serverInfo;
            if (cc.sys.isNative) {
                var url = cc.url.raw("resources/ver/cv.txt");
                cc.loader.load(url, function (err, data) {
                    cc.VERSION = data;
                    if (a_serverInfo.version == null) {
                        console.error("a_serverInfo.version == null");
                    } else {
                        if (cc.vv.serverInfo.version != cc.VERSION) {
                            cc.find("Canvas/alert").active = true;
                        } else {
                            cc.director.loadScene(self._mainScene);
                        }
                    }
                }.bind(this));
            } else {
                cc.director.loadScene(self._mainScene);
            }
        };

        var xmlHttpRequest = null;
        var complete = false;
        var fnGetServerInfo = function () {
            self.labelLoadingProgess.string = "正在连接服务器...";
            xmlHttpRequest = cc.vv.http.sendRequest("/get_serverinfo", null, function (a_serverInfo) {
                xmlHttpRequest = null;
                complete = true;
                fnGetVersion(a_serverInfo);
            });
            setTimeout(fnConnect, 5000);
        }

        var fnConnect = function () {
            if (!complete) {
                if (xmlHttpRequest) {
                    xmlHttpRequest.abort();
                    self.labelLoadingProgess.string = "连接失败，即将重试。";
                    setTimeout(function () {
                        fnGetServerInfo();
                    }, 5000);
                } else {
                    fnGetServerInfo();
                }
            }
        };

        fnConnect();
    },

    log: function (a_content) {
        this.labelLog.string += a_content + "\n";
    },
});