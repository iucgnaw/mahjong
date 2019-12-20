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

exports.MJ_PLAYER_STATE_IDLE = "Idle";
exports.MJ_PLAYER_STATE_GET_TURN = "Get Turn";
exports.MJ_PLAYER_STATE_FULL_HAND = "Full Hand";
exports.MJ_PLAYER_STATE_DISCARDING_TILE = "Discarding Tile";
exports.MJ_PLAYER_STATE_BEING_TARGETED = "Being Targeted";
exports.MJ_PLAYER_STATE_THINKING_ON_DISCARDING_TILE = "Thinking on Discarding Tile";
exports.MJ_PLAYER_STATE_CHOWING = "Chowing";
exports.MJ_PLAYER_STATE_THINKING_ON_CHOWING = "Thinking on Chowing";
exports.MJ_PLAYER_STATE_PONGING = "Ponging";
exports.MJ_PLAYER_STATE_THINKING_ON_PONGING = "Thinking on Ponging";
exports.MJ_PLAYER_STATE_KONGING = "Konging";
exports.MJ_PLAYER_STATE_THINKING_ON_KONGING = "Thinking on Konging";
exports.MJ_PLAYER_STATE_WINING = "Wining";
exports.MJ_PLAYER_STATE_THINKING_ON_WINING = "Thinking on Wining";

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
	if (a_tile >= MJ_TILE_DOT_1 && a_tile <= MJ_TILE_DOT_9) {
		return MJ_TILE_SUIT_DOT;
	} else if (a_tile >= MJ_TILE_BAMBOO_1 && a_tile <= MJ_TILE_BAMBOO_9) {
		return MJ_TILE_SUIT_BAMBOO;
	} else if (a_tile >= MJ_TILE_CHARACTER_1 && a_tile <= MJ_TILE_CHARACTER_9) {
		return MJ_TILE_SUIT_CHARACTER;
	} else if (a_tile >= MJ_TILE_WIND_1_EAST && a_tile <= MJ_TILE_WIND_4_NORTH) {
		return MJ_TILE_SUIT_WIND;
	} else if (a_tile >= MJ_TILE_DRAGON_1_RED && a_tile <= MJ_TILE_DRAGON_3_WHITE) {
		return MJ_TILE_SUIT_DRAGON;
	} else if (a_tile >= MJ_TILE_SEASON_1_SPRING && a_tile <= MJ_TILE_FLOWER_4_CHRYSANTHEMUM) {
		return MJ_TILE_SUIT_HONOR;
	} else {
		return MJ_TILE_SUIT_INVALID;
	}
}

exports.sortTiles = function (a_tiles) {
	a_tiles.sort(function (a_tile1, a_tile2) {
		return a_tile1 - a_tile2;
	});
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
}

// module.exports = {
//     MJ_TILE_NUMBER: MJ_TILE_NUMBER
// };