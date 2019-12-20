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
        bgmVolume: 1.0,
        sfxVolume: 1.0,

        _bgmAudioId: -1,
    },

    // use this for initialization
    init: function () {
        var item = cc.sys.localStorage.getItem("bgmVolume");
        if (item != null) {
            this.bgmVolume = parseFloat(item);
        }

        var item = cc.sys.localStorage.getItem("sfxVolume");
        if (item != null) {
            this.sfxVolume = parseFloat(item);
        }

        cc.game.on(cc.game.EVENT_HIDE, function () {
            cc.audioEngine.pauseAll();
        });

        cc.game.on(cc.game.EVENT_SHOW, function () {
            cc.audioEngine.resumeAll();
        });
    },

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },

    getUrl: function (a_url) {
        return cc.url.raw("resources/sounds/" + a_url);
    },

    playBgm(a_url) {
        var audioUrl = this.getUrl(a_url);
        if (this._bgmAudioId >= 0) {
            cc.audioEngine.stop(this._bgmAudioId);
        }
        this._bgmAudioId = cc.audioEngine.play(audioUrl, true, this.bgmVolume);
        // cc.loader.loadRes(audioUrl, cc.AudioClip, function (err, clip) {
        //     cc.audioEngine.play(clip);
        // });
    },

    playSfx(a_url) {
        var audioUrl = this.getUrl(a_url);
        if (this.sfxVolume > 0) {
            var audioId = cc.audioEngine.play(audioUrl, false, this.sfxVolume);
            // cc.loader.loadRes(audioUrl, cc.AudioClip, function (err, clip) {
            //     cc.audioEngine.play(clip);
            // });
        }
    },

    setSfxVolume: function (a_volume) {
        if (this.sfxVolume != a_volume) {
            cc.sys.localStorage.setItem("sfxVolume", a_volume);
            this.sfxVolume = a_volume;
        }
    },

    setBgmVolume: function (a_volume, a_force) {
        if (this._bgmAudioId >= 0) {
            if (a_volume > 0) {
                cc.audioEngine.resume(this._bgmAudioId);
            } else {
                cc.audioEngine.pause(this._bgmAudioId);
            }
            //cc.audioEngine.setVolume(this._bgmAudioId,this.bgmVolume);
        }

        if (this.bgmVolume != a_volume || a_force) {
            cc.sys.localStorage.setItem("bgmVolume", a_volume);
            this.bgmVolume = a_volume;
            cc.audioEngine.setVolume(this._bgmAudioId, a_volume);
        }
    },

    pauseAll: function () {
        cc.audioEngine.pauseAll();
    },

    resumeAll: function () {
        cc.audioEngine.resumeAll();
    }
});