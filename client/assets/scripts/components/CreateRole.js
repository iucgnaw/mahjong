cc.Class({
    extends: cc.Component,

    properties: {
        inputName: cc.EditBox,
        // foo: {
        //    default: null,
        //    url: cc.Texture2D,  // optional, default is typeof default
        //    serializable: true, // optional, default is true
        //    visible: true,      // optional, default is true
        //    displayName: 'Foo', // optional
        //    readonly: false,    // optional, default is false
        // },
        // ...
    },

    onRandomBtnClicked: function () {
        var names = [
            "王璀",
            "李神",
            "涂勇",
            "祝悦琼",
            "叶振凯",
            "黎杞昌",
            "李沁晖",
            "周波",
            "叶骅",
            "吴皓",
            "陈擘",
        ];

        var idx = Math.floor(Math.random() * (names.length - 1));
        this.inputName.string = names[idx];
    },

    // use this for initialization
    onLoad: function () {
        console.log("createrole scene, CreateRole.js, onLoad()");

        cc.vv.utils.fitCanvasWithFrame();
        this.onRandomBtnClicked();
    },

    onBtnConfirmClicked: function () {
        var name = this.inputName.string;
        if (name == "") {
            console.log("invalid name.");
            return;
        }
        // console.log(name);
        cc.vv.userMgr.create(name);
    }
    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});