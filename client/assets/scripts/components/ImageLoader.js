function loadImage(url, code, callback) {
    /*
    if(cc.vv.images == null){
        cc.vv.images = {};
    }
    var imageInfo = cc.vv.images[url];
    if(imageInfo == null){
        imageInfo = {
            image:null,
            queue:[],
        };
        cc.vv.images[url] = imageInfo;
    }
    
    cc.loader.load(url,function (err,tex) {
        imageInfo.image = tex;
        var spriteFrame = new cc.SpriteFrame(tex, cc.Rect(0, 0, tex.width, tex.height));
        for(var i = 0; i < imageInfo.queue.length; ++i){
            var itm = imageInfo.queue[i];
            itm.callback(itm.code,spriteFrame);
        }
        itm.queue = [];
    });
    if(imageInfo.image != null){
        var tex = imageInfo.image;
        var spriteFrame = new cc.SpriteFrame(tex, cc.Rect(0, 0, tex.width, tex.height));
        callback(code,spriteFrame);
    }
    else{
        imageInfo.queue.push({code:code,callback:callback});
    }*/
    cc.loader.load(url, function (err, tex) {
        var spriteFrame = new cc.SpriteFrame(tex, cc.Rect(0, 0, tex.width, tex.height));
        callback(code, spriteFrame);
    });
};

function getBaseInfo(userId, callback) {
    if (cc.vv.baseInfoMap == null) {
        cc.vv.baseInfoMap = {};
    }

    if (cc.vv.baseInfoMap[userId] != null) {
        callback(userId, cc.vv.baseInfoMap[userId]);
    } else {
        cc.vv.http.sendRequest("/base_info", {
            userId: userId
        }, function (ret) {
            var url = null;
            if (ret.headimgurl) {
                url = cc.vv.http.g_masterUrl + "/image?url=" + encodeURIComponent(ret.headimgurl) + ".jpg";
            }
            var info = {
                name: ret.name,
                sex: ret.sex,
                url: url,
            }
            cc.vv.baseInfoMap[userId] = info;
            callback(userId, info);

        }, cc.vv.http.g_masterUrl);
    }
};

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
        this.setupSpriteFrame();
    },

    setUserID: function (userId) {
        if (!userId) {
            return;
        }
        if (cc.vv.images == null) {
            cc.vv.images = {};
        }

        var self = this;
        getBaseInfo(userId, function (a_code, a_info) {
            if (a_info && a_info.url) {
                loadImage(a_info.url, userId, function (err, spriteFrame) {
                    self._spriteFrame = spriteFrame;
                    self.setupSpriteFrame();
                });
            }
        });
    },

    setupSpriteFrame: function () {
        if (this._spriteFrame) {
            var spr = this.getComponent(cc.Sprite);
            if (spr) {
                spr.spriteFrame = this._spriteFrame;
            }
        }
    }
    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});