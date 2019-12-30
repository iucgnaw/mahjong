var m_mahjong = require("../../../../common/mahjong.js");

cc.Class({
    extends: cc.Component,

    properties: {
        nodeTable: {
            default: null,
            type: cc.Node
        },

        _labelGameCount: null,
        _animationAll: [],
    },

    onLoad: function () {
        cc.vv.utils.fitCanvasWithFrame();

        this.addComponent("GameOver");
        this.addComponent("TimePointer");
        this.addComponent("GameResult");
        this.addComponent("Chat");
        this.addComponent("ReplayCtrl");
        this.addComponent("PopupMgr");
        this.addComponent("ReConnect");
        this.addComponent("Voice");
        this.addComponent("UserInfoShow");
        this.addComponent("Status");

        this.initView();
        this.initEventHandlers();

        this.nodeTable.active = false;
        this.on_event_server_push_game_sync();

        cc.vv.audioMgr.playBgm("bgFight.mp3");

        cc.vv.utils.addQuitEvent(this.node);
    },

    initView: function () {
        var nodeInfo = this.node.getChildByName("nodeInfo");
        var labelRoomNum = nodeInfo.getChildByName("nodeRoomNum").getComponent(cc.Label);
        labelRoomNum.string = "房间号：" + cc.vv.gameNetMgr.roomId;

        var nodeTable = this.node.getChildByName("nodeTable");

        this._labelGameCount = nodeTable.getChildByName("nodeGameCount").getComponent(cc.Label);
        this._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "/" + cc.vv.gameNetMgr.maxHandCount + "局";

        var nodeJokerTile = nodeTable.getChildByName("nodeJokerTile");
        nodeJokerTile.active = false;

        var sideNames = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        for (var idxSide = 0; idxSide < sideNames.length; idxSide++) {
            var nodeSide = nodeTable.getChildByName(sideNames[idxSide]);

            var nodeHandTiles = nodeSide.getChildByName("nodeHandTiles");
            for (var idxTile = 0; idxTile < nodeHandTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
                // Store default attributes
                nodeTile.xDefault = nodeTile.x;
                nodeTile.yDefault = nodeTile.y;
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrameDefault = sprite.spriteFrame;
                // Hide tile
                nodeTile.active = false;
            }

            var nodeMelds = nodeSide.getChildByName("nodeMelds");
            for (var idxMeld = 0; idxMeld < nodeMelds.childrenCount; ++idxMeld) {
                var nodeMeld = nodeMelds.getChildByName("nodeMeld" + idxMeld);
                for (var idxTile = 0; idxTile < nodeMeld.childrenCount; ++idxTile) {
                    var nodeTile = nodeMeld.getChildByName("nodeTile" + idxTile);
                    if (idxTile < (nodeMeld.childrenCount - 1)) { // Tile 0 - 2
                        nodeTile._rotationDegree = 0;
                    } else { // Tile 3
                        nodeTile._rotationDegree = 270;
                    }
                }
            }

            var nodeDiscardedTiles = nodeSide.getChildByName("nodeDiscardedTiles");
            for (var idxTile = 0; idxTile < nodeDiscardedTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeDiscardedTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = false;
            }

            this._animationAll.push(nodeSide.getChildByName("nodeAnimation").getComponent(cc.Animation));
        }
    },

    start: function () {},

    initEventHandlers: function () {
        cc.vv.gameNetMgr.dataEventHandler = this.node;

        //初始化事件监听器
        var self = this;

        this.node.on("event_server_push_game_sync", function (a_data) {
            self.on_event_server_push_game_sync();
        });

        this.node.on("event_server_brc_change_turn", function (a_data) {
            if (a_data.previousTurn != cc.vv.gameNetMgr.seatIndex) {}

            if (!cc.vv.replayMgr.isReplaying() && a_data.turn != cc.vv.gameNetMgr.seatIndex) {}
        });

        this.node.on("event_server_push_message", function (a_data) {
            alert("服务器消息：\r\n" + a_data);
        });

        this.node.on("event_server_brc_hand_count", function (a_data) {
            self._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "/" + cc.vv.gameNetMgr.maxHandCount + "局";
        });

        this.node.on("event_server_brc_hand_end", function (a_data) {
            self.nodeTable.active = false;
        });

        this.node.on("event_server_brc_discarding_tile", function (a_data) {
            var seat = a_data.seat;
            //如果是自己，则刷新手牌
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            } else {
                self.refreshSeatTiles(seat);
            }

            cc.vv.audioMgr.playSfx("give.mp3");

            var audioUrl = cc.vv.mahjongmgr.getAudioUrlByTile(a_data.tile);
            cc.vv.audioMgr.playSfx(audioUrl);
        });

        this.node.on("event_server_brc_player_pass", function (a_data) {
            var seat = a_data;
            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_pass");
            cc.vv.audioMgr.playSfx("mahjong/action/action_pass.mp3");
        });

        this.node.on("event_server_brc_nobody_thinking", function (a_data) {
            var seat = a_data;
            //如果是自己，则刷新手牌
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            }
        });

        this.node.on("event_server_brc_set_aside", function (a_data) {
            var seat = a_data;
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            } else {
                self.refreshSeatTiles(seat);
            }

            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_set_aside");
            cc.vv.audioMgr.playSfx("mahjong/action/action_set_aside.mp3");
        });

        this.node.on("event_server_brc_chowing", function (a_data) {
            var seat = a_data;
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            } else {
                self.refreshSeatTiles(seat);
            }

            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_chow");
            cc.vv.audioMgr.playSfx("mahjong/action/action_chow.mp3");
        });

        this.node.on("event_server_brc_ponging", function (a_data) {
            var seat = a_data;
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            } else {
                self.refreshSeatTiles(seat);
            }

            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_pong");
            cc.vv.audioMgr.playSfx("mahjong/action/action_pong.mp3");
        });

        this.node.on("event_server_brc_konging", function (a_seat) {
            var seat = a_seat;
            if (seat.seatIndex == cc.vv.gameNetMgr.seatIndex) {
                self.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
            } else {
                self.refreshSeatTiles(seat);
            }

            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_kong");
            cc.vv.audioMgr.playSfx("mahjong/action/action_kong.mp3");
        });

        this.node.on("event_server_brc_winning", function (a_seat) {
            var seat = a_seat;
            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);

            self.playActionAnimation(localIndex, "action_win");
            cc.vv.audioMgr.playSfx("mahjong/action/action_win.mp3");
        });

        this.node.on("event_login_result", function () {
            self.nodeTable.active = false;
        });
    },

    playActionAnimation: function (a_index, a_name) {
        this._animationAll[a_index].node.active = true;
        this._animationAll[a_index].play(a_name);
    },

    on_event_server_push_game_sync: function () {
        var nodeTable = this.node.getChildByName("nodeTable");

        nodeTable.getChildByName("nodeTilewallRemaining").getComponent(cc.Label).string = "剩余" + cc.vv.gameNetMgr.tilewallRemaining + "张";

        var sideNames = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        for (var idxSide = 0; idxSide < sideNames.length; idxSide++) {
            var nodeSide = nodeTable.getChildByName(sideNames[idxSide]);

            var nodeMelds = nodeSide.getChildByName("nodeMelds");
            for (var idxMeld = 0; idxMeld < nodeMelds.childrenCount; ++idxMeld) {
                var nodeMeld = nodeMelds.getChildByName("nodeMeld" + idxMeld);
                nodeMeld.active = false;
                for (var idxTile = 0; idxTile < nodeMeld.childrenCount; ++idxTile) {
                    var nodeTile = nodeMeld.getChildByName("nodeTile" + idxTile);
                    nodeTile.active = false;
                }
            }

            var nodeHonorTiles = nodeSide.getChildByName("nodeHonorTiles");
            for (var idxTile = 0; idxTile < nodeHonorTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeHonorTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = false;
            }

            var nodeHandTiles = nodeSide.getChildByName("nodeHandTiles");
            for (var idxTile = 0; idxTile < nodeHandTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
                // Restore default attributes
                nodeTile.x = nodeTile.xDefault;
                nodeTile.y = nodeTile.yDefault;
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = sprite.spriteFrameDefault;
                nodeTile.active = false;
            }

            var nodeDiscardedTiles = nodeSide.getChildByName("nodeDiscardedTiles");
            for (var idxTile = 0; idxTile < nodeDiscardedTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeDiscardedTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = false;
            }

            var nodeSeat = nodeSide.getChildByName("nodeSeat");
            var nodeScore = nodeSeat.getChildByName("score");
            var labelScore = nodeScore.getComponent(cc.Label);
            var natualIndex = cc.vv.gameNetMgr.getNatualIndex(idxSide);
            var seat = cc.vv.gameNetMgr.seats[natualIndex];
            if (seat.fsmPlayerState) {
                labelScore.string = seat.fsmPlayerState;
            }
        }

        this.nodeTable.active = true;

        var localIndex = cc.vv.gameNetMgr.getLocalIndex(0);
        if (!cc.vv.gameNetMgr.seats[localIndex].handTiles) { // TOFIX
            return;
        }
        this.refreshSeatTiles(cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex]);
        for (var idxSeat in cc.vv.gameNetMgr.seats) {
            var seat = cc.vv.gameNetMgr.seats[idxSeat];
            var localIndex = cc.vv.gameNetMgr.getLocalIndex(idxSeat);
            if (localIndex != 0) { // Not bottom seat
                if (!seat.handTiles) { // TOFIX
                    return;
                }
                this.refreshSeatTiles(seat);
            }
        }

        if (cc.vv.gameNetMgr.jokerTile != m_mahjong.MJ_TILE_INVALID) {
            var nodeJokerTile = nodeTable.getChildByName("nodeJokerTile");
            var sprite = nodeJokerTile.getComponent(cc.Sprite);
            sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile("_front_standing_bottom", cc.vv.gameNetMgr.jokerTile);
            nodeJokerTile.active = true;
        }
    },

    onClickedTile: function (a_event) {
        var nodeTable = this.node.getChildByName("nodeTable");
        var nodeSide = nodeTable.getChildByName("nodeSideBottom");
        var nodeHandTiles = nodeSide.getChildByName("nodeHandTiles");
        for (var idxNodeTile = 0, idxTile = 0; idxNodeTile < nodeHandTiles.childrenCount; ++idxNodeTile) {
            var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxNodeTile);
            if (nodeTile.active == false) {
                continue;
            }
            if (a_event.target == nodeTile) { // Found 
                var seat = cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex];
                var handTiles = seat.handTiles;
                if (handTiles[idxTile].pose == "standing") {
                    handTiles[idxTile].pose = "lying";
                } else {
                    handTiles[idxTile].pose = "standing";
                }
                cc.vv.net.send("client_req_sync_handtiles", handTiles);
                return;
            }
            idxTile++;
        }
    },

    refreshSeatTiles: function (a_seat) {
        var localIndex = cc.vv.gameNetMgr.getLocalIndex(a_seat.seatIndex);
        var sideString = cc.vv.mahjongmgr.getSideString(localIndex);

        var nodeGame = this.node.getChildByName("nodeTable");
        var nodeSide = nodeGame.getChildByName(sideString);
        var nodeHandTiles = nodeSide.getChildByName("nodeHandTiles");

        // Show melds
        var nodeMelds = nodeSide.getChildByName("nodeMelds");
        for (var idxMeld = 0; idxMeld < a_seat.melds.length; idxMeld++) {
            console.assert(a_seat.melds[idxMeld].tiles.length <= 4);

            var nodeMeld = nodeMelds.getChildByName("nodeMeld" + idxMeld);
            nodeMeld.active = true;

            for (var idxTile = 0; idxTile < a_seat.melds[idxMeld].tiles.length; idxTile++) {
                var nodeTile = nodeMeld.getChildByName("nodeTile" + idxTile);
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTilePose(a_seat.melds[idxMeld].tiles[idxTile], localIndex, nodeTile._rotationDegree);
                nodeTile.active = true;
            }
        }

        var meldTilesNum = a_seat.melds.length * 3;
        // Hide tiles positions that overlay with melds
        for (var idxTile = 0; idxTile < meldTilesNum; idxTile++) {
            var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
            nodeTile.active = false; // Hide these tiles
        }

        var prefixString = cc.vv.mahjongmgr.getPrefixStringTileFrontLying(localIndex);
        if (a_seat.handTiles != null) {
            var handTiles = a_seat.handTiles;

            // Set hands SpriteFrame
            for (var idxTile = 0; idxTile < handTiles.length; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + (idxTile + meldTilesNum));
                var sprite = nodeTile.getComponent(cc.Sprite);
                if (handTiles[idxTile].pose == "standing") {
                    if (sideString == "nodeSideBottom") {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile("_front_standing_bottom", handTiles[idxTile].tile);
                    } else {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameTileBackStanding(localIndex);
                    }
                } else {
                    sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, handTiles[idxTile].tile);
                    if (sideString == "nodeSideBottom") {
                        sprite.node.y += 10;
                    } else if (sideString == "nodeSideRight") {
                        sprite.node.x -= 20;
                    } else if (sideString == "nodeSideTop") {
                        sprite.node.y -= 35;
                    } else if (sideString == "nodeSideLeft") {
                        sprite.node.x += 20;
                    }
                }
                nodeTile.active = true; // Show this tile
            }
            // Hide other positions neither melds nor hands
            for (var idxTile = meldTilesNum + handTiles.length; idxTile < nodeHandTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = null;
            }
        }

        if (a_seat.discardedTiles != null) {
            var discardedTiles = a_seat.discardedTiles;
            var nodeDiscardedTiles = nodeSide.getChildByName("nodeDiscardedTiles");

            for (var idxTile = 0; idxTile < discardedTiles.length; ++idxTile) {
                var nodeTile = nodeDiscardedTiles.getChildByName("nodeTile" + idxTile);
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, discardedTiles[idxTile]);
                nodeTile.active = true; // Show this tile
            }
        }

        if (a_seat.honorTiles != null) {
            var honorTiles = a_seat.honorTiles;
            var nodeHonorTiles = nodeSide.getChildByName("nodeHonorTiles");

            // Set honor tiles SpriteFrame
            for (var idxTile = 0; idxTile < honorTiles.length; ++idxTile) {
                var nodeTile = nodeHonorTiles.getChildByName("nodeTile" + idxTile);
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, honorTiles[idxTile]);
                nodeTile.active = true; // Show this tile
            }
        }
    },

    onClickAction: function (a_event) {
        var seat = cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex];
        var selectedTiles = {
            type: "",
            tiles: [],
        };
        for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
            if (seat.handTiles[idxTile].pose == "lying") {
                selectedTiles.tiles.push(seat.handTiles[idxTile].tile);
            }
        }

        switch (a_event.target.name) {
            case "nodeActionSetAside":
                if (selectedTiles.tiles.length < 1) {
                    alert("客户端消息：\r\n请选手牌。");
                    return;
                }

                cc.vv.net.send("client_req_action_steal", m_mahjong.MJ_ACTION_SET_ASIDE);
                break;

            case "nodeActionBackdraw":
                cc.vv.net.send("client_req_action_backdraw_tile");
                break;

            case "nodeActionDraw":
                cc.vv.net.send("client_req_action_draw_tile");
                break;

            case "nodeActionDiscard":
                var tile;
                if (selectedTiles.tiles.length <= 0) {
                    alert("客户端消息：\r\n请选择1张手牌。");
                    return;
                } else if (selectedTiles.tiles.length > 1) {
                    alert("客户端消息：\r\n由于选择了多张手牌，将随机打出一张。");
                    var index = Math.floor(Math.random() * selectedTiles.tiles.length + 0);
                    tile = selectedTiles.tiles[index];
                } else {
                    tile = selectedTiles.tiles[0];
                }
                cc.vv.net.send("client_req_action_discard_tile", tile);
                break;

            case "nodeActionPass":
                cc.vv.net.send("client_req_action_pass");
                break;

            case "nodeActionReject":
                cc.vv.net.send("client_req_action_reject");
                break;

            case "nodeActionChow":
                if (selectedTiles.tiles.length != 2) {
                    alert("客户端消息：\r\n请选择2张手牌。");
                    return;
                }
                selectedTiles.type = "meld_chow";

                cc.vv.net.send("client_req_action_steal", m_mahjong.MJ_ACTION_CHOW);
                break;

            case "nodeActionPong":
                if (selectedTiles.tiles.length != 2) {
                    alert("客户端消息：\r\n请选择2张手牌。");
                    return;
                }
                selectedTiles.type = "meld_pong";

                cc.vv.net.send("client_req_action_steal", m_mahjong.MJ_ACTION_PONG);
                break;

            case "nodeActionKong":
                if (selectedTiles.tiles.length == 1) {
                    selectedTiles.type = "meld_pong_to_kong";
                } else if (selectedTiles.tiles.length == 3) {
                    selectedTiles.type = "meld_exposed_kong";
                } else if (selectedTiles.tiles.length == 4) {
                    selectedTiles.type = "meld_concealed_kong";
                } else {
                    alert("客户端消息：\r\n如果是明杠，请选择3张手牌。如果是暗杠，请选择4张手牌。如果是补杠，请选择1张手牌。");
                    return;
                }

                cc.vv.net.send("client_req_action_steal", m_mahjong.MJ_ACTION_KONG);
                break;

            case "nodeActionWin":
                cc.vv.net.send("client_req_action_win");
                break;
        }
    },

    onBtnSettingsClicked: function () {
        cc.vv.popupMgr.showSettings();
    },

    // called every frame, uncomment this function to activate update callback
    update: function (dt) {},

    onDestroy: function () {
        if (cc.vv) {
            cc.vv.gameNetMgr.clear();
        }
    }
});