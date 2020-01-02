function loadImage(a_url, a_code, a_fnCallback) {
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
    cc.loader.load(a_url, function (a_err, a_texture) {
        var spriteFrame = new cc.SpriteFrame(a_texture, cc.Rect(0, 0, a_texture.width, a_texture.height));
        a_fnCallback(a_code, spriteFrame);
    });
};

function getBaseInfo(a_userId, a_fnCallback) {
    if (cc.vv.baseInfoMap == null) {
        cc.vv.baseInfoMap = {};
    }

    if (cc.vv.baseInfoMap[a_userId] != null) {
        a_fnCallback(a_userId, cc.vv.baseInfoMap[a_userId]);
    } else {
        cc.vv.http.sendRequest("/base_info", {
            userId: a_userId
        }, function (a_ret) {
            var url = null;
            if (a_ret.headimgurl) {
                url = cc.vv.http.g_masterUrl + "/image?url=" + encodeURIComponent(a_ret.headimgurl) + ".jpg";
            }
            var info = {
                name: a_ret.name,
                sex: a_ret.sex,
                url: url,
            }
            cc.vv.baseInfoMap[a_userId] = info;
            a_fnCallback(a_userId, info);

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

    setUserID: function (a_userId) {
        if (!a_userId) {
            return;
        }
        if (cc.vv.images == null) {
            cc.vv.images = {};
        }

        var self = this;
        getBaseInfo(a_userId, function (a_code, a_info) {
            if (a_info && a_info.url) {
                loadImage(a_info.url, a_userId, function (a_err, a_spriteFrame) {
                    self._spriteFrame = a_spriteFrame;
                    self.setupSpriteFrame();
                });
            }
        });
    },

    setupSpriteFrame: function () {
        if (this._spriteFrame) {
            var sprite = this.getComponent(cc.Sprite);
            if (sprite) {
                sprite.spriteFrame = this._spriteFrame;
            }
        }
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});