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
    },

    // use this for initialization
    onLoad: function () {
        console.log("AppStart scene, AppStart.js, onLoad()");

        initMgr();

        cc.vv.utils.fitCanvasWithFrame();

        this._sceneLogin = "Login";

        this.getServerInfo();
    },

    onButtonOkClicked: function () {
        cc.sys.openURL(cc.vv.serverInfo.appweb);
    },

    getServerInfo: function () {
        var self = this;
        var fnGetVersion = function (a_serverInfo) {
            cc.vv.serverInfo = a_serverInfo;

            if (cc.sys.isNative) {
                var urlCurrentVersion = cc.url.raw("resources/ver/cv.txt");
                cc.loader.load(urlCurrentVersion, function (a_err, a_version) {
                    cc.VERSION = a_version;
                    if (a_serverInfo.version == null) {
                        console.error("a_serverInfo.version == null");
                    } else {
                        if (cc.vv.serverInfo.version != cc.VERSION) {
                            cc.find("Canvas/nodeAlert").active = true;
                        } else {
                            cc.director.loadScene(self._sceneLogin);
                        }
                    }
                }.bind(this));
            } else {
                cc.director.loadScene(self._sceneLogin);
            }
        };

        var xmlHttpRequest = null;
        var connected = false;
        var fnGetServerInfo = function () {
            cc.find("Canvas/nodeConnectionStatus").getComponent(cc.Label).string = "正在连接账户服务器...";

            xmlHttpRequest = cc.vv.http.sendRequest("/get_server_info", null, function (a_serverInfo) {
                xmlHttpRequest = null;
                connected = true;
                fnGetVersion(a_serverInfo);
            });

            setTimeout(fnConnect, 5000);
        }

        var fnConnect = function () {
            if (!connected) {
                if (xmlHttpRequest) { // Has pending request
                    xmlHttpRequest.abort();

                    cc.find("Canvas/nodeConnectionStatus").getComponent(cc.Label).string = "连接失败，即将重试...";

                    setTimeout(function () {
                        fnGetServerInfo();
                    }, 1000);
                } else {
                    fnGetServerInfo();
                }
            }
        };

        fnConnect();
    },
});