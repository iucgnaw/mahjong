var MJ_ACTION_DISCARD_TILE = 1;
var MJ_ACTION_DRAW_TILE = 2;
var MJ_ACTION_PONG = 3;
var MJ_ACTION_KONG = 4;
var MJ_ACTION_WIN = 5;
var MJ_ACTION_WIN_SELFDRAW = 6;
var MJ_ACTION_CHOW = 7;

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
        _lastAction: null,
        _actionRecords: null,
        _actionRecordsIndex: 0,
    },

    // use this for initialization
    onLoad: function () {

    },

    clear: function () {
        this._lastAction = null;
        this._actionRecords = null;
        this._actionRecordsIndex = 0;
    },

    init: function (data) {
        this._actionRecords = data.action_records;
        if (this._actionRecords == null) {
            this._actionRecords = {};
        }
        this._actionRecordsIndex = 0;
        this._lastAction = null;
    },

    isReplaying: function () {
        return this._actionRecords != null;
    },

    getNextAction: function () {
        if (this._actionRecordsIndex >= this._actionRecords.length) {
            return null;
        }

        var si = this._actionRecords[this._actionRecordsIndex++];
        var action = this._actionRecords[this._actionRecordsIndex++];
        var tile = this._actionRecords[this._actionRecordsIndex++];
        return {
            si: si,
            type: action,
            tile: tile
        };
    },

    takeAction: function () {
        var action = this.getNextAction();
        if (this._lastAction != null && this._lastAction.type == MJ_ACTION_DISCARD_TILE) {
            if (action != null && action.type != MJ_ACTION_PONG && action.type != MJ_ACTION_KONG && action.type != MJ_ACTION_WIN) {
                cc.vv.gameNetMgr.on_server_brc_nobody_thinking(this._lastAction.si, this._lastAction.tile);
            }
        }
        this._lastAction = action;
        if (action == null) {
            return -1;
        }
        var nextActionDelay = 1.0;
        if (action.type == MJ_ACTION_DISCARD_TILE) {
            //console.log("MJ_ACTION_DISCARD_TILE");
            cc.vv.gameNetMgr.on_server_brc_discarding_tile(action.si, action.tile);
            return 1.0;
        } else if (action.type == MJ_ACTION_DRAW_TILE) {
            //console.log("MJ_ACTION_DRAW_TILE");
            cc.vv.gameNetMgr.on_server_resp_draw_tile(action.si, action.tile);
            cc.vv.gameNetMgr.doChangeTurn(action.si);
            return 0.5;
        } else if (action.type == MJ_ACTION_CHOW) {
            //console.log("MJ_ACTION_PONG");
            cc.vv.gameNetMgr.on_server_brc_chowing(action.si, action.tile);
            cc.vv.gameNetMgr.doChangeTurn(action.si);
            return 1.0;
        } else if (action.type == MJ_ACTION_PONG) {
            //console.log("MJ_ACTION_PONG");
            cc.vv.gameNetMgr.on_server_brc_ponging(action.si, action.tile);
            cc.vv.gameNetMgr.doChangeTurn(action.si);
            return 1.0;
        } else if (action.type == MJ_ACTION_KONG) {
            //console.log("MJ_ACTION_KONG");
            cc.vv.gameNetMgr.on_server_brc_konging(action.si, action.tile);
            cc.vv.gameNetMgr.doChangeTurn(action.si);
            return 1.0;
        } else if (action.type == MJ_ACTION_WIN) {
            //console.log("MJ_ACTION_WIN");
            cc.vv.gameNetMgr.doWin({
                seatIndex: action.si,
                hupai: action.tile,
            });
            return 1.5;
        }
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});