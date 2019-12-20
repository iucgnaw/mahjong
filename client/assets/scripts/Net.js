if (window.io == null) {
    window.io = require("socket-io");
}

var Global = cc.Class({
    extends: cc.Component,
    statics: {
        ip: "",
        sio: null,
        isPinging: false,
        fnDisconnect: null,
        handlers: {},

        addHandler: function (a_event, a_fnHandler) {
            if (this.handlers[a_event]) {
                console.log("event: " + a_event + " - handler has been registered.");
                return;
            }

            var fnHandler = function (a_data) {
                if (a_event != "disconnect" && a_event != "server_push_message" && typeof (a_data) == "string") {
                    a_data = JSON.parse(a_data); // TODO: should parse in each handler, not here!
                }
                console.log("received msg: " + a_event + ", a_data(" + typeof (a_data) + "): " + a_data);
                console.log(a_data);
                a_fnHandler(a_data);
            };

            this.handlers[a_event] = fnHandler;
            if (this.sio) {
                console.log("register event handler: " + a_event);
                this.sio.on(a_event, fnHandler);
            }
        },

        connect: function (a_fnConnect, a_fnError) {
            var self = this;

            var sioOptions = {
                "reconnection": false,
                "force new connection": true,
                "transports": ["websocket", "polling"]
            }
            this.sio = window.io.connect(this.ip, sioOptions);
            this.sio.on("reconnect", function () {
                console.warn("received event: reconnect");
            });

            this.sio.on("connect", function (a_data) {
                self.sio.connected = true;
                a_fnConnect(a_data);
            });

            this.sio.on("disconnect", function (a_data) {
                // console.log("disconnect");
                self.sio.connected = false;
                self.close();
            });

            this.sio.on("connect_failed", function () {
                console.warn("received event: connect_failed");
            });

            for (var eventName in this.handlers) {
                var fnHandler = this.handlers[eventName];
                if (typeof (fnHandler) == "function") {
                    if (eventName == "disconnect") {
                        this.fnDisconnect = fnHandler;
                    } else {
                        // console.log("register:function " + key);
                        this.sio.on(eventName, fnHandler);
                    }
                }
            }

            this.startHeartbeat();
        },

        startHeartbeat: function () {
            this.sio.on("server_heartbeat", function () {
                self.lastRecieveTime = Date.now();
                self._timeRtt = self.lastRecieveTime - self.lastSendTime;
                // console.log("Received server_heartbeat, RTT: " + self._timeRtt + "ms");
            });
            this.lastRecieveTime = Date.now();
            var self = this;
            // console.log(1);
            if (!self.isPinging) {
                self.isPinging = true;

                cc.game.on(cc.game.EVENT_HIDE, function () {
                    self.ping();
                });

                setInterval(function () {
                    if (self.sio) {
                        self.ping();
                    }
                }.bind(this), 5000);

                setInterval(function () {
                    if (self.sio) {
                        if (Date.now() - self.lastRecieveTime > 10000) {
                            self.close();
                        }
                    }
                }.bind(this), 500);
            }
        },

        send: function (event, data) {
            if (this.sio.connected) {
                if ((data != null) && (typeof (data) == "object")) {
                    data = JSON.stringify(data);
                    //console.log(data);              
                }
                if (data == null) {
                    data = "";
                }
                this.sio.emit(event, data);
            }
        },

        ping: function () {
            if (this.sio) {
                this.lastSendTime = Date.now();
                this.send("client_heartbeat");
            }
        },

        close: function () {
            // console.log("close");
            this._timeRtt = null;
            if (this.sio && this.sio.connected) {
                this.sio.connected = false;
                this.sio.disconnect();
            }
            this.sio = null;
            if (this.fnDisconnect) {
                this.fnDisconnect();
                this.fnDisconnect = null;
            }
        },

        test: function (a_cbResult) {
            var cbTest = function (a_ret) {
                a_cbResult(a_ret.errcode == 0);
            }
            cc.vv.http.sendRequest("/hi", null, cbTest, "http://" + this.ip);
        }
    },
});