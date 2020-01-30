var g_mysql = require("mysql");
var m_crypto = require('./crypto');

var g_pool = null;

function nop(a, b, c, d, e, f, g) {

}

function generateUserId() {
    var Id = "";
    for (var i = 0; i < 6; ++i) {
        if (i > 0) {
            Id += Math.floor(Math.random() * 10);
        } else {
            Id += Math.floor(Math.random() * 9) + 1;
        }
    }
    return Id;
}

function query(a_sql, a_callback) {
    g_pool.getConnection(function (a_error, a_connection) {
        if (a_error) {
            a_callback(a_error, null, null);
        } else {
            a_connection.query(a_sql, function (a_queryError, a_values, a_fields) {
                //释放连接  
                a_connection.release();
                //事件驱动回调  
                a_callback(a_queryError, a_values, a_fields);
            });
        }
    });
};

exports.init = function (a_config) {
    g_pool = g_mysql.createPool({
        host: a_config.HOST,
        user: a_config.USER,
        password: a_config.PSWD,
        database: a_config.DB,
        port: a_config.PORT,
    });
};

exports.is_account_exist = function (a_account, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null) {
        a_callback(false);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + a_account + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            if (a_rows.length > 0) {
                a_callback(true);
            } else {
                a_callback(false);
            }
        }
    });
};

exports.create_account = function (a_account, a_password, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null || a_password == null) {
        a_callback(false);
        return;
    }

    var passwordMd5 = m_crypto.md5(a_password);
    var sql = 'INSERT INTO t_accounts(account,password) VALUES("' + a_account + '","' + passwordMd5 + '")';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            if (a_error.code == 'ER_DUP_ENTRY') {
                a_callback(false);
                return;
            }
            a_callback(false);
            throw a_error;
        } else {
            a_callback(true);
        }
    });
};

exports.get_account_info = function (a_account, a_password, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + a_account + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }

        if (a_password != null) {
            var psw = m_crypto.md5(a_password);
            if (a_rows[0].password == psw) {
                a_callback(null);
                return;
            }
        }

        a_callback(a_rows[0]);
    });
};

exports.is_user_exist = function (a_account, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null) {
        a_callback(false);
        return;
    }

    var sql = 'SELECT userId FROM t_users WHERE account = "' + a_account + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(false);
            return;
        }

        a_callback(true);
    });
}


exports.get_user_data = function (a_account, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT userId,account,name,lv,exp,coins,gems,roomId FROM t_users WHERE account = "' + a_account + '"';
    query(sql, function (a_err, a_rows, a_fields) {
        if (a_err) {
            a_callback(null);
            throw a_err;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }
        a_rows[0].name = m_crypto.fromBase64(a_rows[0].name);
        a_callback(a_rows[0]);
    });
};

exports.get_user_profile_by_user_id = function (a_userId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT userId,account,name,lv,exp,coins,gems,roomId FROM t_users WHERE userId = ' + a_userId;
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }
        a_rows[0].name = m_crypto.fromBase64(a_rows[0].name);
        a_callback(a_rows[0]);
    });
};

/**增加玩家房卡 */
exports.add_user_gems = function (a_userId, a_gems, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null) {
        a_callback(false);
        return;
    }

    var sql = 'UPDATE t_users SET gems = gems +' + a_gems + ' WHERE userId = ' + a_userId;
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            console.error(a_error);
            a_callback(false);
            return;
        } else {
            a_callback(a_rows.affectedRows > 0);
            return;
        }
    });
};

exports.get_gems = function (a_account, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE account = "' + a_account + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }

        a_callback(a_rows[0]);
    });
};

exports.get_user_history = function (a_userId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT history FROM t_users WHERE userId = "' + a_userId + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }
        var history = a_rows[0].history;
        if (history == null || history == "") {
            a_callback(null);
        } else {
            // console.log("history.length: " + history.length);
            history = JSON.parse(history);
            a_callback(history);
        }
    });
};

exports.update_user_history = function (a_userId, a_history, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null || a_history == null) {
        a_callback(false);
        return;
    }

    a_history = JSON.stringify(a_history);
    var sql = 'UPDATE t_users SET roomId = null, history = \'' + a_history + '\' WHERE userId = "' + a_userId + '"';
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(false);
            return;
        }

        a_callback(true);
    });
};

exports.get_games_of_room = function (a_roomUuid, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomUuid == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = "' + a_roomUuid + '"';
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }

        a_callback(a_rows);
    });
};

exports.get_detail_of_game = function (a_roomUuid, a_index, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomUuid == null || a_index == null) {
        a_callback(null);
        return;
    }
    var sql = 'SELECT base_info,action_records FROM t_games_archive WHERE room_uuid = "' + a_roomUuid + '" AND game_index = ' + a_index;
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }

        if (a_rows.length == 0) {
            a_callback(null);
            return;
        }
        a_callback(a_rows[0]);
    });
}

exports.create_user = function (a_account, a_name, a_coins, a_gems, a_sex, a_headImg, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_account == null || a_name == null || a_coins == null || a_gems == null) {
        a_callback(false);
        return;
    }
    if (a_headImg) {
        a_headImg = '"' + a_headImg + '"';
    } else {
        a_headImg = 'null';
    }
    a_name = m_crypto.toBase64(a_name);
    var userId = generateUserId();

    var sql = 'INSERT INTO t_users(userId,account,name,coins,gems,sex,headimg) VALUES("{0}", "{1}","{2}",{3},{4},{5},{6})';
    sql = sql.format(userId, a_account, a_name, a_coins, a_gems, a_sex, a_headImg);
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            throw a_error;
        }
        a_callback(true);
    });
};

exports.update_user_info = function (a_userId, a_name, a_headImg, a_sex, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null) {
        a_callback(null);
        return;
    }

    if (a_headImg) {
        a_headImg = '"' + a_headImg + '"';
    } else {
        a_headImg = 'null';
    }
    a_name = m_crypto.toBase64(a_name);
    var sql = 'UPDATE t_users SET name="{0}",headimg={1},sex={2} WHERE account="{3}"';
    sql = sql.format(a_name, a_headImg, a_sex, a_userId);
    // console.log(sql);
    query(sql, function (err, rows, fields) {
        if (err) {
            throw err;
        }
        a_callback(rows);
    });
};

exports.get_user_profile = function (a_userId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_userId == null) {
        a_callback(null);
        return;
    }
    var sql = 'SELECT name,sex,headimg FROM t_users WHERE userId={0}';
    sql = sql.format(a_userId);
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            throw a_error;
        }
        a_rows[0].name = m_crypto.fromBase64(a_rows[0].name);
        a_callback(a_rows[0]);
    });
};

exports.is_room_exist = function (a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'SELECT * FROM t_rooms WHERE id = "' + a_roomId + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(a_rows.length > 0);
        }
    });
};

exports.cost_gems = function (a_userId, a_cost, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'UPDATE t_users SET gems = gems -' + a_cost + ' WHERE userId = ' + a_userId;
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(a_rows.length > 0);
        }
    });
};

exports.set_room_id_of_user = function (a_userId, a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomId != null) {
        a_roomId = '"' + a_roomId + '"';
    }
    var sql = 'UPDATE t_users SET roomId = ' + a_roomId + ' WHERE userId = "' + a_userId + '"';
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            console.error(a_error);
            a_callback(false);
            throw a_error;
        } else {
            a_callback(a_rows.length > 0);
        }
    });
};

exports.get_room_id_of_user = function (a_userId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'SELECT roomId FROM t_users WHERE userId = "' + a_userId + '"';
    query(sql, function (err, rows, fields) {
        if (err) {
            a_callback(null);
            throw err;
        } else {
            if (rows.length > 0) {
                a_callback(rows[0].roomId);
            } else {
                a_callback(null);
            }
        }
    });
};

exports.create_room = function (a_roomId, a_roomConfig, a_ip, a_port, a_createTime, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = "INSERT INTO t_rooms(uuid,id,base_info,ip,port,create_time) VALUES('{0}','{1}','{2}','{3}',{4},{5})";
    var uuid = Date.now() + a_roomId;
    var baseInfo = JSON.stringify(a_roomConfig);
    sql = sql.format(uuid, a_roomId, baseInfo, a_ip, a_port, a_createTime);
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        } else {
            a_callback(uuid);
        }
    });
};

exports.get_room_uuid = function (a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + a_roomId + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        } else {
            a_callback(a_rows[0].uuid);
        }
    });
};

exports.update_seat_info = function (a_roomId, a_seatIndex, a_userId, a_icon, a_name, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'UPDATE t_rooms SET user_id_{0} = {1},user_icon_{0} = "{2}",user_name_{0} = "{3}" WHERE id = "{4}"';
    a_name = m_crypto.toBase64(a_name);
    sql = sql.format(a_seatIndex, a_userId, a_icon, a_name, a_roomId);
    //console.log(sql);
    query(sql, function (err, row, fields) {
        if (err) {
            a_callback(false);
            throw err;
        } else {
            a_callback(true);
        }
    });
}

exports.update_num_of_turns = function (a_roomId, a_numOfTurns, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'UPDATE t_rooms SET num_of_turns = {0} WHERE id = "{1}"'
    sql = sql.format(a_numOfTurns, a_roomId);
    //console.log(sql);
    query(sql, function (err, row, fields) {
        if (err) {
            a_callback(false);
            throw err;
        } else {
            a_callback(true);
        }
    });
};


exports.update_next_dealer = function (a_roomId, a_nextDealer, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = 'UPDATE t_rooms SET next_dealer = {0} WHERE id = "{1}"'
    sql = sql.format(a_nextDealer, a_roomId);
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(true);
        }
    });
};

exports.get_room_addr = function (a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomId == null) {
        a_callback(false, null, null);
        return;
    }

    var sql = 'SELECT ip,port FROM t_rooms WHERE id = "' + a_roomId + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false, null, null);
            throw a_error;
        }
        if (a_rows.length > 0) {
            a_callback(true, a_rows[0].ip, a_rows[0].port);
        } else {
            a_callback(false, null, null);
        }
    });
};

exports.get_room_data = function (a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomId == null) {
        a_callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms WHERE id = "' + a_roomId + '"';
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        }
        if (a_rows.length > 0) {
            a_rows[0].user_name_0 = m_crypto.fromBase64(a_rows[0].user_name_0);
            a_rows[0].user_name_1 = m_crypto.fromBase64(a_rows[0].user_name_1);
            a_rows[0].user_name_2 = m_crypto.fromBase64(a_rows[0].user_name_2);
            a_rows[0].user_name_3 = m_crypto.fromBase64(a_rows[0].user_name_3);
            a_callback(a_rows[0]);
        } else {
            a_callback(null);
        }
    });
};

exports.delete_room = function (a_roomId, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomId == null) {
        a_callback(false);
    }
    var sql = "DELETE FROM t_rooms WHERE id = '{0}'";
    sql = sql.format(a_roomId);
    // console.log(sql);
    query(sql, function (a_err, a_rows, a_fields) {
        if (a_err) {
            a_callback(false);
            throw a_err;
        } else {
            a_callback(true);
        }
    });
}

exports.create_game = function (a_roomUuid, a_index, a_baseInfo, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = "INSERT INTO t_games(room_uuid,game_index,base_info,create_time) VALUES('{0}',{1},'{2}',unix_timestamp(now()))";
    sql = sql.format(a_roomUuid, a_index, a_baseInfo);
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(null);
            throw a_error;
        } else {
            a_callback(a_rows.insertId);
        }
    });
};

exports.delete_games = function (a_roomUuid, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomUuid == null) {
        a_callback(false);
    }
    var sql = "DELETE FROM t_games WHERE room_uuid = '{0}'";
    sql = sql.format(a_roomUuid);
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(true);
        }
    });
}

exports.archive_games = function (a_roomUuid, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomUuid == null) {
        a_callback(false);
    }
    var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = '{0}')";
    sql = sql.format(a_roomUuid);
    // console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            exports.delete_games(a_roomUuid, function (ret) {
                a_callback(ret);
            });
        }
    });
}

exports.update_game_action_records = function (a_roomUuid, a_index, a_actions, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    var sql = "UPDATE t_games SET action_records = '" + a_actions + "' WHERE room_uuid = '" + a_roomUuid + "' AND game_index = " + a_index;
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(true);
        }
    });
};

exports.update_game_result = function (a_roomUuid, a_index, a_result, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;
    if (a_roomUuid == null || a_result) {
        a_callback(false);
    }

    a_result = JSON.stringify(a_result);
    var sql = "UPDATE t_games SET result = '" + a_result + "' WHERE room_uuid = '" + a_roomUuid + "' AND game_index = " + a_index;
    //console.log(sql);
    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            a_callback(true);
        }
    });
};

exports.get_message = function (a_type, a_version, a_callback) {
    a_callback = a_callback == null ? nop : a_callback;

    var sql = 'SELECT * FROM t_message WHERE type = "' + a_type + '"';

    if (a_version == "null") {
        a_version = null;
    }

    if (a_version) {
        a_version = '"' + a_version + '"';
        sql += ' AND version != ' + a_version;
    }

    query(sql, function (a_error, a_rows, a_fields) {
        if (a_error) {
            a_callback(false);
            throw a_error;
        } else {
            if (a_rows.length > 0) {
                a_callback(a_rows[0]);
            } else {
                a_callback(null);
            }
        }
    });
};

exports.query = query;