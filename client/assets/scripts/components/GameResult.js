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
        _gameresult: null,
        _scriptGameResultSeats: [],
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }

        this._gameresult = this.node.getChildByName("nodeGameResult");
        //this._gameresult.active = false;

        var seats = this._gameresult.getChildByName("nodeSeats");
        for (var i = 0; i < seats.childrenCount; ++i) {
            this._scriptGameResultSeats.push(seats.children[i].getComponent("Seat"));
        }

        var btnClose = cc.find("Canvas/nodeGameResult/btnClose");
        if (btnClose) {
            cc.vv.utils.addClickEvent(btnClose, this.node, "GameResult", "onBtnCloseClicked");
        }

        var btnShare = cc.find("Canvas/nodeGameResult/btnShare");
        if (btnShare) {
            cc.vv.utils.addClickEvent(btnShare, this.node, "GameResult", "onBtnShareClicked");
        }

        //初始化网络事件监听器
        var self = this;
        this.node.on("event_server_brc_match_end", function (a_endinfo) {
            self.onGameEnd(a_endinfo);
        });
    },

    showResult: function (seat, info, isZuiJiaPaoShou) {
        seat.node.getChildByName("zuijiapaoshou").active = isZuiJiaPaoShou;

        // seat.node.getChildByName("zimocishu").getComponent(cc.Label).string = info.numzimo;
        // seat.node.getChildByName("jiepaocishu").getComponent(cc.Label).string = info.numjiepao;
        // seat.node.getChildByName("dianpaocishu").getComponent(cc.Label).string = info.numdianpao;
        // seat.node.getChildByName("angangcishu").getComponent(cc.Label).string = info.numangang;
        // seat.node.getChildByName("minggangcishu").getComponent(cc.Label).string = info.numminggang;
        // seat.node.getChildByName("chajiaocishu").getComponent(cc.Label).string = info.numchadajiao;
    },

    onGameEnd: function (a_endinfo) {
        var seats = cc.vv.gameNetMgr.seats;
        var maxscore = -1;
        var maxdianpao = 0;
        var dianpaogaoshou = -1;
        for (var idxSeat = 0; idxSeat < seats.length; ++idxSeat) {
            var seat = seats[idxSeat];
            if (seat.score > maxscore) {
                maxscore = seat.score;
            }
            // if (endinfo[i].numdianpao > maxdianpao) {
            //     maxdianpao = endinfo[i].numdianpao;
            //     dianpaogaoshou = i;
            // }
        }

        for (var idxSeat = 0; idxSeat < seats.length; ++idxSeat) {
            var seat = seats[idxSeat];
            var isBigwin = false;
            if (seat.score > 0) {
                isBigwin = seat.score == maxscore;
            }
            this._scriptGameResultSeats[idxSeat].setUser_Name_Score(seat.name, seat.score);
            this._scriptGameResultSeats[idxSeat].setUser_Id_Image(seat.userId);
            var isZuiJiaPaoShou = dianpaogaoshou == idxSeat;
            this.showResult(this._scriptGameResultSeats[idxSeat], a_endinfo[idxSeat], isZuiJiaPaoShou);
        }
    },

    onBtnCloseClicked: function () {
        cc.vv.wc.show("正在返回游戏大厅");
        cc.director.loadScene("hall");
    },

    onBtnShareClicked: function () {
        cc.vv.anysdkMgr.shareResult();
    }
});