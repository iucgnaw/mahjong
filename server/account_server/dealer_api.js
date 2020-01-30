var m_express = require("express");
var m_db = require("../utils/db");
var m_http = require("../utils/http");

var g_express_dealer_api = m_express();

exports.start = function (config) {
	g_express_dealer_api.listen(config.DEALDER_API_PORT, config.DEALDER_API_IP);
	console.log("dealer api is listening on " + config.DEALDER_API_IP + ":" + config.DEALDER_API_PORT);
};

//设置跨域访问
g_express_dealer_api.all("*", function (a_request, a_response, a_fnNext) {
	a_response.header("Access-Control-Allow-Origin", "*");
	a_response.header("Access-Control-Allow-Headers", "X-Requested-With");
	a_response.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	a_response.header("X-Powered-By", " 3.2.1")
	a_response.header("Content-Type", "application/json;charset=utf-8");
	a_fnNext();
});

g_express_dealer_api.get("/get_user_profile", function (a_request, a_response) {
	var userId = a_request.query.userId;
	m_db.get_user_profile_by_user_id(userId, function (a_profile) {
		if (a_profile) {
			var ret = {
				userId: userId,
				name: a_profile.name,
				gems: a_profile.gems,
				headimg: a_profile.headimg
			}
			m_http.send(a_response, 0, "Ok.", ret);
		} else {
			m_http.send(a_response, 1, "Get user profile fail.");
		}
	});
});

g_express_dealer_api.get("/add_user_gems", function (a_request, a_response) {
	var userId = a_request.query.userId;
	var gems = a_request.query.gems;
	m_db.add_user_gems(userId, gems, function (a_success) {
		if (a_success) {
			m_http.send(a_response, 0, "Ok.");
		} else {
			m_http.send(a_response, 1, "Add user gems fail.");
		}
	});
});