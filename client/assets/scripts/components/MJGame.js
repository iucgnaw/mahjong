var m_mahjong = require("../../../../common/mahjong.js");

cc.Class({
    extends: cc.Component,

    properties: {
        _secondCountDown: -1,
        _secondAlarm: -1,

        _labelGameCount: null,
        _animationAll: [],

        _isMatchEnd: false,
    },

    onLoad: function () {
        console.log("mjgame scene, MJGame.js, onLoad()");

        cc.vv.utils.fitCanvasWithFrame();

        this.addComponent("GameResult");
        this.addComponent("ReplayCtrl");
        this.addComponent("PopupMgr");
        this.addComponent("ReConnect");
        this.addComponent("Status");

        this.initView();
        this.initEventHandlers();

        this.on_event_server_push_game_sync();

        cc.vv.audioMgr.playBgm("bgm_fight.mp3");

        cc.vv.utils.addQuitEvent(this.node);
    },

    initView: function () {
        var nodeInfo = this.node.getChildByName("nodeInfo");
        var labelRoomNum = nodeInfo.getChildByName("nodeRoomNum").getComponent(cc.Label);
        labelRoomNum.string = "房间号：" + cc.vv.gameNetMgr.roomId;

        var nodeTable = this.node.getChildByName("nodeTable");

        this._labelGameCount = nodeTable.getChildByName("nodeGameCount").getComponent(cc.Label);
        // this._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "/" + cc.vv.gameNetMgr.maxHandCount + "局";
        this._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "局";

        nodeTable.getChildByName("nodeIndicator").getChildByName("nodeCountdown").getComponent(cc.Label).string = "0";

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
                nodeTile.opacityDefault = nodeTile.opacity;
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
        cc.vv.gameNetMgr.eventHandlerNode = this.node;

        //初始化事件监听器
        var self = this;

        this.node.on("event_update_seat_status", function (a_seat) {
            self.on_event_server_push_game_sync();
        });

        this.node.on("event_server_push_game_sync", function (a_data) {
            self.on_event_server_push_game_sync();
        });

        this.node.on("event_server_push_message", function (a_data) {
            alert("服务器消息：\r\n" + a_data);
        });

        this.node.on("event_server_brc_hand_count", function (a_data) {
            // self._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "/" + cc.vv.gameNetMgr.maxHandCount + "局";
            self._labelGameCount.string = "" + cc.vv.gameNetMgr.gameIndex + "局";
        });

        this.node.on("event_server_brc_change_turn", function (data) {
            self.refreshPointer();
            self._secondCountDown = 10;
            self._secondAlarm = 3;
        });

        this.node.on("event_server_brc_action_discard", function (a_data) {
            var seat = a_data.seat;
            var localIndex = cc.vv.gameNetMgr.getLocalIndex(seat.seatIndex);
            self.playActionAnimation(localIndex, "action_discard");
            cc.vv.audioMgr.playSfx("mahjong/effect/effect_discard.mp3");
            cc.vv.audioMgr.playSfx(cc.vv.mahjongmgr.getAudioUrlByTile(a_data.tile));
        });

        this.node.on("event_server_brc_action", function (a_eventData) {
            var actionName = null;
            var effectName = null;
            switch (a_eventData.action) {
                case m_mahjong.MJ_ACTION_BACKDRAW:
                    actionName = "action_backdraw";
                    effectName = "effect_draw";
                    break;
                case m_mahjong.MJ_ACTION_CHOW:
                    actionName = "action_chow";
                    effectName = "effect_steal";
                    break;
                case m_mahjong.MJ_ACTION_DISCARD:
                    actionName = "action_discard";
                    effectName = "effect_discard";
                    break;
                case m_mahjong.MJ_ACTION_DRAW:
                    actionName = "action_draw";
                    effectName = "effect_draw";
                    break;
                case m_mahjong.MJ_ACTION_KONG:
                    actionName = "action_kong";
                    effectName = "effect_steal";
                    break;
                case m_mahjong.MJ_ACTION_PASS:
                    actionName = "action_pass";
                    effectName = "effect_reject";
                    break;
                case m_mahjong.MJ_ACTION_PONG:
                    actionName = "action_pong";
                    effectName = "effect_steal";
                    break;
                case m_mahjong.MJ_ACTION_REJECT:
                    actionName = "action_reject";
                    effectName = "effect_reject";
                    break;
                case m_mahjong.MJ_ACTION_SET_ASIDE:
                    actionName = "action_set_aside";
                    effectName = "effect_discard";
                    break;
                case m_mahjong.MJ_ACTION_WIN:
                    actionName = "action_win";
                    effectName = "effect_win";
                    break;
            }
            self.playActionAnimation(cc.vv.gameNetMgr.getLocalIndex(a_eventData.seatIndex), actionName);
            cc.vv.audioMgr.playSfx("mahjong/action/" + actionName + ".mp3");
            cc.vv.audioMgr.playSfx("mahjong/effect/" + effectName + ".mp3");
        });

        this.node.on("event_server_brc_hand_end", function (a_ignore) {
            var nodeScoring = self.node.getChildByName("nodeScoring");
            nodeScoring.active = true;
            console.log("******** activate in this.node.on(event_server_brc_hand_end, function (a_ignore)");
        });

        this.node.on("event_server_brc_match_end", function (a_ignore) {
            self._isMatchEnd = true;
        });
    },

    playActionAnimation: function (a_index, a_name) {
        this._animationAll[a_index].node.active = true;
        this._animationAll[a_index].play(a_name);
    },

    on_event_server_push_game_sync: function () {
        var nodeTable = this.node.getChildByName("nodeTable");

        nodeTable.getChildByName("nodeTilewallRemaining").getComponent(cc.Label).string = "剩余" + cc.vv.gameNetMgr.tilewallRemaining + "张";

        var nodeJokerTile = nodeTable.getChildByName("nodeJokerTile");
        if (cc.vv.gameNetMgr.jokerTile != m_mahjong.MJ_TILE_INVALID) {
            var sprite = nodeJokerTile.getComponent(cc.Sprite);
            sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile("_front_standing_bottom", cc.vv.gameNetMgr.jokerTile);
            nodeJokerTile.active = true;
        } else {
            nodeJokerTile.active = false;
        }

        // TOFIX
        if (cc.vv.gameNetMgr.fsmTableState) {
            nodeTable.getChildByName("nodeTableState").getComponent(cc.Label).string = cc.vv.gameNetMgr.fsmTableState;
        } else {
            nodeTable.getChildByName("nodeTableState").getComponent(cc.Label).string = "null";
        }

        var sideNames = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        // Hide and reset all tiles
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
                nodeTile.opacity = nodeTile.opacityDefault;
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
            nodeSeat.active = false;
        }

        this.refreshPointer();

        for (var idxSeat in cc.vv.gameNetMgr.seats) {
            this.refreshSeat(cc.vv.gameNetMgr.seats[idxSeat]);
        }

        // Sync score board
        var nodeScoring = this.node.getChildByName("nodeScoring");
        if (cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex].fsmPlayerState == m_mahjong.MJ_PLAYER_STATE_SCORING) {
            nodeScoring.active = true;
            console.log("******** activate in on_event_server_push_game_sync: function ()");
        } else {
            nodeScoring.active = false;
        }
        var nodeScoreBoard = nodeScoring.getChildByName("nodeScoreBoard");
        var buttonSubmit = nodeScoring.getChildByName("buttonSubmit").getComponent(cc.Button);
        buttonSubmit.interactable = true; // Enable first, and will be disabled if any mismatch
        for (var idxNode = 0; idxNode < nodeScoreBoard.childrenCount; ++idxNode) {
            var nodeSeat = nodeScoreBoard.getChildByName("nodeSeat" + (idxNode + 1));
            if ((idxNode + 1) < cc.vv.gameNetMgr.seats.length) {
                nodeSeat.active = true;
                var editboxReceivable = nodeSeat.getChildByName("editboxReceivable").getComponent(cc.EditBox);
                var labelPayable = nodeSeat.getChildByName("labelPayable").getComponent(cc.Label);

                var transferFrom = cc.vv.gameNetMgr.seatIndex
                var transferTo = cc.vv.gameNetMgr.getNatualIndex(idxNode + 1);
                for (var idxTransaction = 0; idxTransaction < cc.vv.gameNetMgr.scoreBoard.length; idxTransaction++) {
                    if ((cc.vv.gameNetMgr.scoreBoard[idxTransaction].transferFrom == transferFrom) &&
                        (cc.vv.gameNetMgr.scoreBoard[idxTransaction].transferTo == transferTo)) {
                        labelPayable.string = cc.vv.gameNetMgr.scoreBoard[idxTransaction].value != null ? cc.vv.gameNetMgr.scoreBoard[idxTransaction].value : "null";
                        break;
                    }
                }

                if (parseInt(editboxReceivable.string) != -parseInt(labelPayable.string)) {
                    buttonSubmit.interactable = false;
                }
            } else {
                nodeSeat.active = false;
            }
        }
    },

    refreshPointer: function () {
        var nodeTable = this.node.getChildByName("nodeTable");
        var nodeIndicator = nodeTable.getChildByName("nodeIndicator");
        var nodePointer = nodeIndicator.getChildByName("nodePointer");
        var turnLocalIndex = cc.vv.gameNetMgr.getLocalIndex(cc.vv.gameNetMgr.turn);
        for (var idxPointer = 0; idxPointer < nodePointer.childrenCount; ++idxPointer) {
            nodePointer.children[idxPointer].active = (idxPointer == turnLocalIndex);
        }
    },

    refreshSeat: function (a_seat) {
        var localIndex = cc.vv.gameNetMgr.getLocalIndex(a_seat.seatIndex);
        var sideString = cc.vv.mahjongmgr.getSideString(localIndex);

        var nodeTable = this.node.getChildByName("nodeTable");
        var nodeSide = nodeTable.getChildByName(sideString);

        var nodeSeat = nodeSide.getChildByName("nodeSeat");
        if (a_seat.name) { // Show seat
            nodeSeat.getChildByName("nodePlayerName").getComponent(cc.Label).string = a_seat.name;
            nodeSeat.getChildByName("nodePlayerScore").getComponent(cc.Label).string = a_seat.score;
            nodeSeat.getChildByName("nodeDealer").active = (a_seat.seatIndex == cc.vv.gameNetMgr.dealer);
            nodeSeat.getChildByName("nodeOffline").active = (!a_seat.online);

            // TOFIX
            if (a_seat.fsmPlayerState) {
                nodeSeat.getChildByName("nodePlayerState").getComponent(cc.Label).string = a_seat.fsmPlayerState;
            } else {
                nodeSeat.getChildByName("nodePlayerState").getComponent(cc.Label).string = "null";
            }

            nodeSeat.active = true;
        } else {
            nodeSeat.active = false;
        }

        var nodeHandTiles = nodeSide.getChildByName("nodeHandTiles");
        if (a_seat.melds) { // Show melds
            var nodeMelds = nodeSide.getChildByName("nodeMelds");
            for (var idxMeld = 0; idxMeld < a_seat.melds.length; idxMeld++) {
                console.assert(a_seat.melds[idxMeld].tiles.length <= 4);

                var nodeMeld = nodeMelds.getChildByName("nodeMeld" + idxMeld);
                for (var idxTile = 0; idxTile < a_seat.melds[idxMeld].tiles.length; idxTile++) {
                    var nodeTile = nodeMeld.getChildByName("nodeTile" + idxTile);
                    var sprite = nodeTile.getComponent(cc.Sprite);

                    if (localIndex == 0) {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTilePose(a_seat.melds[idxMeld].tiles[idxTile], localIndex, nodeTile._rotationDegree);
                        if (a_seat.melds[idxMeld].type == "meld_concealed_kong") {
                            nodeTile.opacity = 128;
                        }
                    } else {
                        if (a_seat.melds[idxMeld].type == "meld_concealed_kong") {
                            if (cc.vv.gameNetMgr.fsmTableState == m_mahjong.MJ_TABLE_STATE_SCORING) {
                                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTilePose(a_seat.melds[idxMeld].tiles[idxTile], localIndex, nodeTile._rotationDegree);
                                nodeTile.opacity = 128;
                            } else {
                                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameTileBackLying(localIndex, nodeTile._rotationDegree);
                            }
                        } else {
                            sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTilePose(a_seat.melds[idxMeld].tiles[idxTile], localIndex, nodeTile._rotationDegree);
                        }
                    }

                    nodeTile.active = true;
                }
                nodeMeld.active = true;
            }

            // Hide tiles positions that overlay with melds
            var meldTilesNum = a_seat.melds.length * 3;
            for (var idxTile = 0; idxTile < meldTilesNum; idxTile++) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = false; // Hide these tiles
            }
        }

        var prefixString = cc.vv.mahjongmgr.getPrefixStringTileFrontLying(localIndex);
        if (a_seat.handTiles != null) { // Show hand tiles
            // Set hands SpriteFrame
            for (var idxTile = 0; idxTile < a_seat.handTiles.length; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + (idxTile + meldTilesNum));
                var sprite = nodeTile.getComponent(cc.Sprite);
                if (a_seat.handTiles[idxTile].pose == "standing") {
                    if (sideString == "nodeSideBottom") {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile("_front_standing_bottom", a_seat.handTiles[idxTile].tile);
                    } else {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameTileBackStanding(localIndex);
                    }
                } else if (a_seat.handTiles[idxTile].pose == "selected") {
                    if (sideString == "nodeSideBottom") {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile("_front_standing_bottom", a_seat.handTiles[idxTile].tile);
                    } else {
                        sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameTileBackStanding(localIndex);
                    }
                    if (sideString == "nodeSideBottom") {
                        sprite.node.y += 10;
                    } else if (sideString == "nodeSideRight") {
                        sprite.node.x -= 20;
                    } else if (sideString == "nodeSideTop") {
                        sprite.node.y -= 10;
                    } else if (sideString == "nodeSideLeft") {
                        sprite.node.x += 20;
                    }
                } else { // lying
                    sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, a_seat.handTiles[idxTile].tile);
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
            for (var idxTile = meldTilesNum + a_seat.handTiles.length; idxTile < nodeHandTiles.childrenCount; ++idxTile) {
                var nodeTile = nodeHandTiles.getChildByName("nodeTile" + idxTile);
                nodeTile.active = false;
            }
        }

        if (a_seat.discardedTiles != null) { // Show discarded tiles
            var nodeDiscardedTiles = nodeSide.getChildByName("nodeDiscardedTiles");

            for (var idxTile = 0; idxTile < a_seat.discardedTiles.length; ++idxTile) {
                var nodeTile = nodeDiscardedTiles.getChildByName("nodeTile" + idxTile);
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, a_seat.discardedTiles[idxTile]);
                nodeTile.active = true; // Show this tile
            }
        }

        if (a_seat.honorTiles != null) { // Show honor tiles
            var nodeHonorTiles = nodeSide.getChildByName("nodeHonorTiles");

            // Set honor tiles SpriteFrame
            for (var idxTile = 0; idxTile < a_seat.honorTiles.length; ++idxTile) {
                var nodeTile = nodeHonorTiles.getChildByName("nodeTile" + idxTile);
                var sprite = nodeTile.getComponent(cc.Sprite);
                sprite.spriteFrame = cc.vv.mahjongmgr.getSpriteFrameByTile(prefixString, a_seat.honorTiles[idxTile]);
                nodeTile.active = true; // Show this tile
            }
        }
    },

    onHandTileClicked: function (a_event) {
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
                switch (seat.fsmPlayerState) {
                    case m_mahjong.MJ_PLAYER_STATE_CHOWING:
                    case m_mahjong.MJ_PLAYER_STATE_PONGING:
                    case m_mahjong.MJ_PLAYER_STATE_KONGING:
                    case m_mahjong.MJ_PLAYER_STATE_WINING:
                        alert("客户端消息：\r\n吃、碰、杠、胡中，不能动牌！");
                        return;
                }

                if (seat.handTiles[idxTile].pose == "standing") {
                    seat.handTiles[idxTile].pose = "selected";
                } else {
                    seat.handTiles[idxTile].pose = "standing";
                }
                cc.vv.net.send("client_req_sync_handtiles", seat.handTiles);

                cc.vv.audioMgr.playSfx("mahjong/effect/effect_select.mp3");
                return;
            }
            idxTile++;
        }
    },

    onActionClicked: function (a_event) {
        var seat = cc.vv.gameNetMgr.seats[cc.vv.gameNetMgr.seatIndex];
        var selectedTiles = [];

        for (var idxTile = 0; idxTile < seat.handTiles.length; idxTile++) {
            if (seat.handTiles[idxTile].pose == "selected") {
                selectedTiles.push(seat.handTiles[idxTile].tile);
            }
        }

        switch (a_event.target.name) {
            case "nodeActionSetAside":
                if (selectedTiles.length < 1) {
                    alert("客户端消息：\r\n请选手牌。");
                    return;
                }

                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_SET_ASIDE);
                break;

            case "nodeActionBackdraw":
                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_BACKDRAW);
                break;

            case "nodeActionDraw":
                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_DRAW);
                break;

            case "nodeActionDiscard":
                var tile; // TOFIX
                if (selectedTiles.length <= 0) {
                    alert("客户端消息：\r\n请选择1张手牌。");
                    return;
                } else if (selectedTiles.length > 1) {
                    alert("客户端消息：\r\n由于选择了多张手牌，将随机打出一张。");
                    var index = Math.floor(Math.random() * selectedTiles.length + 0);
                    tile = selectedTiles[index];
                } else {
                    tile = selectedTiles[0];
                }
                cc.vv.net.send("client_req_action_discard_tile", tile);
                break;

            case "nodeActionPass":
                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_PASS);
                break;

            case "nodeActionReject":
                cc.vv.net.send("client_req_action_reject");
                break;

            case "nodeActionChow":
                if (selectedTiles.length != 2) {
                    alert("客户端消息：\r\n请选择2张手牌。");
                    return;
                }

                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_CHOW);
                break;

            case "nodeActionPong":
                if (selectedTiles.length != 2) {
                    alert("客户端消息：\r\n请选择2张手牌。");
                    return;
                }

                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_PONG);
                break;

            case "nodeActionKong":
                if (seat.seatIndex == cc.vv.gameNetMgr.turn) {
                    if ((selectedTiles.length != 1) && (selectedTiles.length != 4)) {
                        alert("客户端消息：\r\n如果是暗杠，请选择4张手牌。如果是碰转杠，请选择1张手牌。");
                        return;
                    } else if (selectedTiles.length == 1) {
                        var pongMeld = null;
                        for (var idxMeld = 0; idxMeld < seat.melds.length; idxMeld++) {
                            if (seat.melds[idxMeld].type == "meld_pong") {
                                if (seat.melds[idxMeld].tiles[0] == selectedTiles[0]) {
                                    pongMeld = seat.melds[idxMeld];
                                    break;
                                }
                            }
                        }
                        if (pongMeld == null) {
                            alert("客户端消息：\r\n没有合适的碰牌，不能碰转杠！");
                            return;
                        }
                    }
                } else {
                    if (selectedTiles.length != 3) {
                        alert("客户端消息：\r\n明杠，请选择3张手牌。");
                        return;
                    }
                }

                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_KONG);
                break;

            case "nodeActionWin":
                cc.vv.net.send("client_req_action", m_mahjong.MJ_ACTION_WIN);
                break;
        }
    },

    onBtnSettingClicked: function () {
        cc.vv.popupMgr.showSettings();
    },

    collectTransactions: function (a_confirmed) {
        var arrayEditboxPayable = [];
        var nodeScoring = this.node.getChildByName("nodeScoring");
        var nodeScoreBoard = nodeScoring.getChildByName("nodeScoreBoard");
        for (var idxNode = 0; idxNode < nodeScoreBoard.childrenCount; ++idxNode) {
            var nodeSeat = nodeScoreBoard.getChildByName("nodeSeat" + (idxNode + 1));
            var editboxReceivable = nodeSeat.getChildByName("editboxReceivable").getComponent(cc.EditBox);
            arrayEditboxPayable.push(editboxReceivable);
        }

        var arrayTransaction = [];
        for (var idxSeat = 1; idxSeat < cc.vv.gameNetMgr.seats.length; idxSeat++) {
            var transaction = {};
            transaction.transferFrom = cc.vv.gameNetMgr.getNatualIndex(idxSeat);
            transaction.transferTo = cc.vv.gameNetMgr.seatIndex;
            transaction.value = parseInt(arrayEditboxPayable[idxSeat - 1].string);
            transaction.confirmed = a_confirmed;
            arrayTransaction.push(transaction);
        }

        return arrayTransaction;
    },

    onTextBoxTextChanged: function (a_text, a_editbox, a_customEventData) {
        cc.vv.net.send("client_req_sync_score", this.collectTransactions(false));
    },

    onButtonSubmitClicked: function () {
        cc.vv.net.send("client_req_sync_score", this.collectTransactions(true));
        var nodeScoring = this.node.getChildByName("nodeScoring");
        nodeScoring.active = false;
    },

    // called every frame, uncomment this function to activate update callback
    update: function (a_deltaSecond) {
        var nodeIndicator = this.node.getChildByName("nodeTable").getChildByName("nodeIndicator");

        if (this._secondCountDown > 0) {
            this._secondCountDown -= a_deltaSecond;

            if ((this._secondAlarm > 0) &&
                (this._secondCountDown < this._secondAlarm)) {
                cc.vv.audioMgr.playSfx("alarm_timeup.mp3");
                this._secondAlarm = -1;
            }

            if (this._secondCountDown < 0) {
                this._secondCountDown = 0;
            }

            var secondCountDownCeiled = Math.ceil(this._secondCountDown);
            nodeIndicator.getChildByName("nodeCountdown").getComponent(cc.Label).string = secondCountDownCeiled;
        }
    },

    onDestroy: function () {
        if (cc.vv) {
            cc.vv.gameNetMgr.clear();
        }
    }
});