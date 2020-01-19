var m_mahjong = require("../../../common/mahjong.js");

cc.Class({
    extends: cc.Component,

    properties: {
        atlasTile: {
            default: null,
            type: cc.SpriteAtlas
        },

        _sidesStrings: null,
        _prefixesStrings: null,
        _frontLyingPrefixStrings: null,
    },

    onLoad: function () {
        console.log("mjgame scene, MahjongMgr.js, onLoad()");

        if (cc.vv == null) {
            return;
        }
        this._sidesStrings = ["nodeSideBottom", "nodeSideRight", "nodeSideTop", "nodeSideLeft"];
        this._frontLyingPrefixStrings = ["_front_lying_bottom", "_front_lying_right", "_front_lying_top", "_front_lying_left"];
        cc.vv.mahjongmgr = this;
    },

    getSpriteFrameByTile: function (a_prefixString, a_tile) {
        var spriteName = m_mahjong.getTileName(a_tile) + a_prefixString;
        return this.atlasTile.getSpriteFrame(spriteName);
    },

    getSpriteFrameByTilePose: function (a_tile, a_localIndex, a_rotationDegree) {
        var sufixString;
        switch (a_localIndex) {
            case 0: // Bottom
                switch (a_rotationDegree) {
                    case 0:
                        sufixString = "_front_lying_bottom";
                        break;
                    case 90:
                        sufixString = "_front_lying_left";
                        break;
                    case 180:
                        sufixString = "_front_lying_top";
                        break;
                    case 270:
                        sufixString = "_front_lying_right";
                        break;
                    default:
                        console.assert(false);
                        break;
                }
                break;

            case 1: // Right
                switch (a_rotationDegree) {
                    case 0:
                        sufixString = "_front_lying_right";
                        break;
                    case 90:
                        sufixString = "_front_lying_bottom";
                        break;
                    case 180:
                        sufixString = "_front_lying_left";
                        break;
                    case 270:
                        sufixString = "_front_lying_top";
                        break;
                    default:
                        console.assert(false);
                        break;
                }
                break;

            case 2: // Top
                switch (a_rotationDegree) {
                    case 0:
                        sufixString = "_front_lying_top";
                        break;
                    case 90:
                        sufixString = "_front_lying_right";
                        break;
                    case 180:
                        sufixString = "_front_lying_bottom";
                        break;
                    case 270:
                        sufixString = "_front_lying_left";
                        break;
                    default:
                        console.assert(false);
                        break;
                }
                break;

            case 3: // Left
                switch (a_rotationDegree) {
                    case 0:
                        sufixString = "_front_lying_left";
                        break;
                    case 90:
                        sufixString = "_front_lying_top";
                        break;
                    case 180:
                        sufixString = "_front_lying_right";
                        break;
                    case 270:
                        sufixString = "_front_lying_bottom";
                        break;
                    default:
                        console.assert(false);
                        break;
                }
                break;

            default:
                console.assert(false);
                break;
        }
        var spriteName = m_mahjong.getTileName(a_tile) + sufixString;
        return this.atlasTile.getSpriteFrame(spriteName);
    },

    getAudioUrlByTile: function (a_tile) {
        var tileName = m_mahjong.getTileName(a_tile);
        return "mahjong/tile/" + tileName + ".mp3";
    },

    getSpriteFrameTileBackLying: function (a_side) {
        if (a_side == "nodeSideTop") {
            return this.atlasTile.getSpriteFrame("back_lying_top");
        } else if (a_side == "nodeSideBottom") {
            return this.atlasTile.getSpriteFrame("back_lying_bottom");
        } else if (a_side == "nodeSideLeft") {
            return this.atlasTile.getSpriteFrame("back_lying_left");
        } else if (a_side == "nodeSideRight") {
            return this.atlasTile.getSpriteFrame("back_lying_right");
        }
    },

    getSpriteFrameTileBackStanding: function (a_localIndex) {
        switch (a_localIndex) {
            case 0:
                return this.atlasTile.getSpriteFrame("back_standing_bottom");
            case 1:
                return this.atlasTile.getSpriteFrame("back_standing_right");
            case 2:
                return this.atlasTile.getSpriteFrame("back_standing_top");
            case 3:
                return this.atlasTile.getSpriteFrame("back_standing_left");
            default:
                console.assert(false);
        }
    },

    getSideString: function (a_localIndex) {
        return this._sidesStrings[a_localIndex];
    },

    getPrefixStringTileFrontLying: function (a_localIndex) {
        return this._frontLyingPrefixStrings[a_localIndex];
    }
});