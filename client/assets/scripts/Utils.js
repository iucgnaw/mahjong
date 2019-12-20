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

    addClickEvent: function (a_node, a_target, a_component, a_handler) {
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = a_target;
        eventHandler.component = a_component;
        eventHandler.handler = a_handler;

        var clickEvents = a_node.getComponent(cc.Button).clickEvents;
        clickEvents.push(eventHandler);
    },

    addSlideEvent: function (a_node, a_target, a_component, a_handler) {
        var eventHandler = new cc.Component.EventHandler();
        eventHandler.target = a_target;
        eventHandler.component = a_component;
        eventHandler.handler = a_handler;

        var slideEvents = a_node.getComponent(cc.Slider).slideEvents;
        slideEvents.push(eventHandler);
    },

    addQuitEvent: function (a_node) {
        cc.eventManager.addListener({
            event: cc.EventListener.KEYBOARD,
            onKeyPressed: function (keyCode, event) {},
            onKeyReleased: function (keyCode, event) {
                if (keyCode == cc.KEY.back) {
                    cc.vv.alert.show("提示", "确定要退出游戏吗？", function () {
                        cc.game.end();
                    }, true);
                }
            }
        }, a_node);
    },

    fitCanvasWithFrame: function () {
        var frameSize = cc.view.getFrameSize();
        var nodeCanvas = cc.find("Canvas");
        var canvas = nodeCanvas.getComponent(cc.Canvas);

        //如果更宽 则让高显示满
        if ((frameSize.width / frameSize.height) > (canvas.designResolution.width / canvas.designResolution.height)) {
            canvas.fitHeight = true;
            canvas.fitWidth = false;
        } else {
            //如果更高，则让宽显示满
            canvas.fitHeight = false;
            canvas.fitWidth = true;
        }
    }

    // called every frame, uncomment this function to activate update callback
    // update: function (dt) {

    // },
});