exports.MJ_TILE_NUMBER = 144;

exports.MJ_TILE_SUIT_INVALID = -1;
exports.MJ_TILE_SUIT_DOT = 0;
exports.MJ_TILE_SUIT_BAMBOO = 1;
exports.MJ_TILE_SUIT_CHARACTER = 2;
exports.MJ_TILE_SUIT_WIND = 3;
exports.MJ_TILE_SUIT_DRAGON = 4;
exports.MJ_TILE_SUIT_HONOR = 5;

exports.MJ_TILE_INVALID = -1;
exports.MJ_TILE_DOT_1 = 0;
exports.MJ_TILE_DOT_2 = 1;
exports.MJ_TILE_DOT_3 = 2;
exports.MJ_TILE_DOT_4 = 3;
exports.MJ_TILE_DOT_5 = 4;
exports.MJ_TILE_DOT_6 = 5;
exports.MJ_TILE_DOT_7 = 6;
exports.MJ_TILE_DOT_8 = 7;
exports.MJ_TILE_DOT_9 = 8;
exports.MJ_TILE_BAMBOO_1 = 9;
exports.MJ_TILE_BAMBOO_2 = 10;
exports.MJ_TILE_BAMBOO_3 = 11;
exports.MJ_TILE_BAMBOO_4 = 12;
exports.MJ_TILE_BAMBOO_5 = 13;
exports.MJ_TILE_BAMBOO_6 = 14;
exports.MJ_TILE_BAMBOO_7 = 15;
exports.MJ_TILE_BAMBOO_8 = 16;
exports.MJ_TILE_BAMBOO_9 = 17;
exports.MJ_TILE_CHARACTER_1 = 18;
exports.MJ_TILE_CHARACTER_2 = 19;
exports.MJ_TILE_CHARACTER_3 = 20;
exports.MJ_TILE_CHARACTER_4 = 21;
exports.MJ_TILE_CHARACTER_5 = 22;
exports.MJ_TILE_CHARACTER_6 = 23;
exports.MJ_TILE_CHARACTER_7 = 24;
exports.MJ_TILE_CHARACTER_8 = 25;
exports.MJ_TILE_CHARACTER_9 = 26;
exports.MJ_TILE_WIND_1_EAST = 27;
exports.MJ_TILE_WIND_2_SOUTH = 28;
exports.MJ_TILE_WIND_3_WEST = 29;
exports.MJ_TILE_WIND_4_NORTH = 30;
exports.MJ_TILE_DRAGON_1_RED = 31;
exports.MJ_TILE_DRAGON_2_GREEN = 32;
exports.MJ_TILE_DRAGON_3_WHITE = 33;
exports.MJ_TILE_SEASON_1_SPRING = 34;
exports.MJ_TILE_SEASON_2_SUMMER = 35;
exports.MJ_TILE_SEASON_3_AUTUMN = 36;
exports.MJ_TILE_SEASON_4_WINTER = 37;
exports.MJ_TILE_FLOWER_1_PLUM = 38;
exports.MJ_TILE_FLOWER_2_ORCHID = 39;
exports.MJ_TILE_FLOWER_3_BAMBOO = 40;
exports.MJ_TILE_FLOWER_4_CHRYSANTHEMUM = 41;
var g_arrayTileName = [
	"dot_1", "dot_2", "dot_3", "dot_4", "dot_5", "dot_6", "dot_7", "dot_8", "dot_9",
	"bamboo_1", "bamboo_2", "bamboo_3", "bamboo_4", "bamboo_5", "bamboo_6", "bamboo_7", "bamboo_8", "bamboo_9",
	"character_1", "character_2", "character_3", "character_4", "character_5", "character_6", "character_7", "character_8", "character_9",
	"wind_1_east", "wind_2_south", "wind_3_west", "wind_4_north",
	"dragon_1_red", "dragon_2_green", "dragon_3_white",
	"season_1_spring", "season_2_summer", "season_3_autumn", "season_4_winter", "flower_1_plum", "flower_2_orchid", "flower_3_bamboo", "flower_4_chrysanthemum"
];

exports.MJ_TABLE_STATE_IDLE = "牌桌空闲";
exports.MJ_TABLE_STATE_REPLACE_HONOR_TILES = "牌桌换花";
exports.MJ_TABLE_STATE_PLAYING = "牌桌对战";

exports.MJ_PLAYER_STATE_INITIAL_WAITING = "开局待换花";
exports.MJ_PLAYER_STATE_INITIAL_REPLACING = "开局换花中";
exports.MJ_PLAYER_STATE_IDLE = "空闲";
exports.MJ_PLAYER_STATE_GET_TURN = "获得轮次";
exports.MJ_PLAYER_STATE_FULL_HAND = "手牌齐";
exports.MJ_PLAYER_STATE_DISCARDING_TILE = "出牌中";
exports.MJ_PLAYER_STATE_BEING_TARGETED = "被瞄上";
exports.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE = "思考已出牌";
exports.MJ_PLAYER_STATE_CHOWING = "吃中";
exports.MJ_PLAYER_STATE_THINKING_ON_CHOWING = "考虑吃中";
exports.MJ_PLAYER_STATE_PONGING = "碰中";
exports.MJ_PLAYER_STATE_THINKING_ON_PONGING = "考虑碰中";
exports.MJ_PLAYER_STATE_KONGING = "杠中";
exports.MJ_PLAYER_STATE_KONG_BACKDRAWING = "杠后补牌中";
exports.MJ_PLAYER_STATE_KONG_BEING_ROBBED = "被抢杠中";
exports.MJ_PLAYER_STATE_THINKING_ON_KONGING = "考虑杠中";
exports.MJ_PLAYER_STATE_WINING = "胡中";
exports.MJ_PLAYER_STATE_THINKING_ON_WINING = "考虑胡中";
exports.MJ_PLAYER_STATE_WON = "胡牌";

exports.MJ_ACTION_BACKDRAW = "Backdraw";
exports.MJ_ACTION_CHOW = "Chow";
exports.MJ_ACTION_DISCARD = "Discard";
exports.MJ_ACTION_DRAW = "Draw";
exports.MJ_ACTION_KONG = "Kong";
exports.MJ_ACTION_PASS = "Pass";
exports.MJ_ACTION_PONG = "Pong";
exports.MJ_ACTION_REJECT = "Reject";
exports.MJ_ACTION_SET_ASIDE = "Set Aside";
exports.MJ_ACTION_WIN = "Win";

exports.getTileName = function (a_tile) {
	return g_arrayTileName[a_tile];
}

exports.getTileSuit = function (a_tile) {
	if (a_tile >= exports.MJ_TILE_DOT_1 && a_tile <= exports.MJ_TILE_DOT_9) {
		return exports.MJ_TILE_SUIT_DOT;
	} else if (a_tile >= exports.MJ_TILE_BAMBOO_1 && a_tile <= exports.MJ_TILE_BAMBOO_9) {
		return exports.MJ_TILE_SUIT_BAMBOO;
	} else if (a_tile >= exports.MJ_TILE_CHARACTER_1 && a_tile <= exports.MJ_TILE_CHARACTER_9) {
		return exports.MJ_TILE_SUIT_CHARACTER;
	} else if (a_tile >= exports.MJ_TILE_WIND_1_EAST && a_tile <= exports.MJ_TILE_WIND_4_NORTH) {
		return exports.MJ_TILE_SUIT_WIND;
	} else if (a_tile >= exports.MJ_TILE_DRAGON_1_RED && a_tile <= exports.MJ_TILE_DRAGON_3_WHITE) {
		return exports.MJ_TILE_SUIT_DRAGON;
	} else if (a_tile >= exports.MJ_TILE_SEASON_1_SPRING && a_tile <= exports.MJ_TILE_FLOWER_4_CHRYSANTHEMUM) {
		return exports.MJ_TILE_SUIT_HONOR;
	} else {
		return exports.MJ_TILE_SUIT_INVALID;
	}
}

exports.compareTiles = function (a_tile1, a_tile2) {
	return a_tile1.tile - a_tile2.tile;
}

// TOFIX should move to right file.
exports.sortHandTiles = function (a_handTiles, a_pirmaryJokerTile) {
	var pirmaryJokerTile = a_pirmaryJokerTile;
	var secondaryJokerTile = pirmaryJokerTile + 1;
	switch (pirmaryJokerTile) {
		case exports.MJ_TILE_DOT_9:
			secondaryJokerTile = exports.MJ_TILE_DOT_1;
			break;
		case exports.MJ_TILE_BAMBOO_9:
			secondaryJokerTile = exports.MJ_TILE_BAMBOO_1;
			break;
		case exports.MJ_TILE_CHARACTER_9:
			secondaryJokerTile = exports.MJ_TILE_CHARACTER_1;
			break;
		case exports.MJ_TILE_WIND_4_NORTH:
			secondaryJokerTile = exports.MJ_TILE_WIND_1_EAST;
			break;
		case exports.MJ_TILE_DRAGON_3_WHITE:
			secondaryJokerTile = exports.MJ_TILE_DRAGON_1_RED;
			break;
		case exports.MJ_TILE_FLOWER_4_CHRYSANTHEMUM:
			secondaryJokerTile = exports.MJ_TILE_SEASON_1_SPRING;
			break;
	}

	var jokerTiles = [];
	// Move joker tiles to a temp array
	for (var idxTile = a_handTiles.length - 1; idxTile >= 0; idxTile--) {
		if ((a_handTiles[idxTile].tile == pirmaryJokerTile) ||
			((a_handTiles[idxTile].tile == secondaryJokerTile))) {
			jokerTiles.push(a_handTiles[idxTile]);
			a_handTiles.splice(idxTile, 1);
		}
	}

	a_handTiles.sort(exports.compareTiles);
	jokerTiles.sort(exports.compareTiles);

	// a_handTiles = jokerTiles.concat(a_handTiles);
	for (var idxTile = jokerTiles.length - 1; idxTile >= 0; idxTile--) {
		a_handTiles.unshift(jokerTiles[idxTile]);
	}
}

exports.shuffleTilewall = function (a_tilewall) {
	// Place tiles in tilewall by order
	var tileCount = 0;
	for (var tile = exports.MJ_TILE_DOT_1; tile <= exports.MJ_TILE_DRAGON_3_WHITE; ++tile) {
		for (var idxTile = 0; idxTile < 4; ++idxTile) {
			a_tilewall[tileCount] = tile;
			tileCount++;
		}
	}
	for (var tile = exports.MJ_TILE_SEASON_1_SPRING; tile <= exports.MJ_TILE_FLOWER_4_CHRYSANTHEMUM; ++tile) {
		a_tilewall[tileCount] = tile;
		tileCount++;
	}

	// Shuffle tilewall
	for (var idxTile = 0; idxTile < a_tilewall.length; ++idxTile) {
		var idxTileBackward = a_tilewall.length - 1 - idxTile; // Choose tile from backward order
		var idxTileForwardRandom = Math.floor(Math.random() * idxTileBackward); // Randamly choose tile from forward order

		// Swap these 2 tiles
		var tileSwap = a_tilewall[idxTileForwardRandom];
		a_tilewall[idxTileForwardRandom] = a_tilewall[idxTileBackward];
		a_tilewall[idxTileBackward] = tileSwap;
	}

	a_tilewall[0] = exports.MJ_TILE_DOT_1;
	a_tilewall[1] = exports.MJ_TILE_DOT_1;
	a_tilewall[2] = exports.MJ_TILE_DOT_1;
	a_tilewall[53] = exports.MJ_TILE_DOT_1;
}

exports.tossDice = function () {
	return (Math.floor(Math.random() * 6 + 1));
}

exports.toss2Dices = function () {
	return exports.tossDice() + exports.tossDice();
}

// module.exports = {
//     MJ_TILE_NUMBER: MJ_TILE_NUMBER
// };