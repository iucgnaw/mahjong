cc.Class({
    extends: cc.Component,

    properties: {
        editboxPlayerName: cc.EditBox,
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
        this.editboxPlayerName.string = names[idx];
    },

    // use this for initialization
    onLoad: function () {
        cc.vv.utils.fitCanvasWithFrame();

        var editboxPlayerName = this.node.getChildByName("editboxPlayerName").getComponent(cc.EditBox);
        editboxPlayerName.enabled = false;
        // this.editboxPlayerName.enabled = false;
        this.onRandomBtnClicked();
    },

    onBtnConfirmClicked: function () {
        var name = this.editboxPlayerName.string;
        if (name == "") {
            alert("选手姓名不能为空！");
            return;
        }

        cc.vv.userMgr.create(name);
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {
    // },
});