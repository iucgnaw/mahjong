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
        _foldsSprites: null,
    },

    // use this for initialization
    onLoad: function () {
        if (cc.vv == null) {
            return;
        }

        this.initView();
        this.initEventHandler();

        this.refreshDiscardedTilesAll();
    },

    initView: function () {
        this._foldsSprites = {};
        var nodeGame = this.node.getChildByName("nodeTable");
        var nodeSidesNames = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        for (var i = 0; i < nodeSidesNames.length; ++i) {
            var nodeSideName = nodeSidesNames[i];
            var nodeSide = nodeGame.getChildByName(nodeSideName);
            var foldsSprites = [];
            var nodeDiscardedTiles = nodeSide.getChildByName("nodeDiscardedTiles");
            for (var j = 0; j < nodeDiscardedTiles.childrenCount; ++j) {
                var nodeTile = nodeDiscardedTiles.getChildByName("nodeTile" + j);
                nodeTile.active = false;
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = null;
                foldsSprites.push(sprite);
            }
            this._foldsSprites[nodeSideName] = foldsSprites;
        }

        this.hideDiscardedTilesAll();
    },

    hideDiscardedTilesAll: function () {
        for (var k in this._foldsSprites) {
            var foldSprites = this._foldsSprites[i];
            for (var i in foldSprites) {
                foldSprites[i].node.active = false;
            }
        }
    },

    initEventHandler: function () {
        var self = this;

        this.node.on("event_server_push_game_sync", function (a_data) {
            self.refreshDiscardedTilesAll();
        });

        this.node.on("event_server_brc_discarding_tile", function (a_data) {
            // self.refreshDiscardedTiles(a_data);
        });

        this.node.on("event_server_brc_nobody_thinking", function (a_data) {
            self.refreshDiscardedTiles(a_data);
        });
    },

    refreshDiscardedTilesAll: function () {
        var seats = cc.vv.gameNetMgr.seats;
        for (var i in seats) {
            this.refreshDiscardedTiles(seats[i]);
        }
    },

    refreshDiscardedTiles: function (a_seat) {
        var discardedTiles = a_seat.discardedTiles;
        if (discardedTiles == null) {
            return;
        }
        var localIndex = cc.vv.gameNetMgr.getLocalIndex(a_seat.seatIndex);
        var prefixString = cc.vv.mahjongmgr.getPrefixStringTileFrontLying(localIndex);
        var sideString = cc.vv.mahjongmgr.getSideString(localIndex);

        var foldsSprites = this._foldsSprites[sideString];
        for (var i = 0; i < foldsSprites.length; ++i) {
            var index = i;
            var sprite = foldsSprites[index];
            sprite.node.active = true;
            sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, discardedTiles[i]);
            sprite.node.active = true;
        }
        for (var i = discardedTiles.length; i < foldsSprites.length; ++i) {
            var index = i;
            var sprite = foldsSprites[index];

            sprite.spriteFrame = null;
            sprite.node.active = false;
        }
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});