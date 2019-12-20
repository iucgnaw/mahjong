var g_defaultUrl = "http://game.iucgnaw.com:11114";

exports.g_masterUrl = null;
exports.g_currentUrl = null;
exports.token = null;

init();

function init() {
    exports.g_masterUrl = g_defaultUrl;
    exports.g_currentUrl = g_defaultUrl;
}

function setUrl(a_url) {
    g_defaultUrl = a_url;
    init();
};

function sendRequest(a_path, a_data, a_handler, a_extraUrl) {
    var xmlHttpRequest = cc.loader.getXMLHttpRequest();
    xmlHttpRequest.timeout = 5000;

    if (a_data == null) {
        a_data = {};
    }
    if (exports.token) {
        a_data.token = exports.token;
    }
    if (a_extraUrl == null) {
        a_extraUrl = exports.g_currentUrl;
    }

    //解析请求路由以及格式化请求参数
    var sendPath = a_path;
    var sendText = "?";
    for (var k in a_data) {
        if (sendText != "?") {
            sendText += "&";
        }
        sendText += (k + "=" + a_data[k]);
    }

    //组装完整的URL
    var requestUrl = a_extraUrl + sendPath + encodeURI(sendText);

    //发送请求
    // console.log("xmlHttpRequest.open(Get), requestUrl: " + requestUrl);
    xmlHttpRequest.open("GET", requestUrl, true);

    if (cc.sys.isNative) {
        xmlHttpRequest.setRequestHeader("Accept-Encoding", "gzip,deflate", "text/html;charset=UTF-8");
    }

    var timer = setTimeout(function () {
        xmlHttpRequest.hasRetried = true;
        xmlHttpRequest.abort();
        console.warn("http timeout");
        retryFunc();
    }, 5000);

    var retryFunc = function () {
        sendRequest(a_path, a_data, a_handler, a_extraUrl); // TOFIX: very likly this cause recursive call?
    };

    xmlHttpRequest.onreadystatechange = function () {
        // console.log("xmlHttpRequest.onreadystatechange()");

        clearTimeout(timer);

        if (xmlHttpRequest.readyState === 4 && (xmlHttpRequest.status >= 200 && xmlHttpRequest.status < 300)) {
            // console.log("http res(" + xhr.responseText.length + "):" + xhr.responseText);
            var responseText = xmlHttpRequest.responseText;
            var responseObject = null;
            try {
                responseObject = JSON.parse(responseText);
            } catch (e) {
                console.error("JSON.parse() cause exception: " + e);
                responseObject = {
                    errcode: -10001,
                    errmsg: e
                };
            }
            // console.log("request from [" + xmlHttpRequest.responseURL + "] data [", responseObject, "]");

            if (a_handler) {
                a_handler(responseObject);
            }

            a_handler = null;
        } else if (xmlHttpRequest.readyState === 4) {
            if (xmlHttpRequest.hasRetried) {
                return;
            }
            // console.log("other readystate == 4" + ", status: " + xmlHttpRequest.status);

            setTimeout(function () {
                retryFunc();
            }, 5000);
        } else {
            // console.log("other readystate: " + xmlHttpRequest.readyState + ", status: " + xmlHttpRequest.status);
        }
    };

    try {
        xmlHttpRequest.send();
    } catch (e) {
        //setTimeout(retryFunc, 200);
        retryFunc();
    }

    return xmlHttpRequest;
}

exports.sendRequest = sendRequest;
exports.setUrl = setUrl;