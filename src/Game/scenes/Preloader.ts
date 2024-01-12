import Phaser from "phaser";

export default class Preloader extends Phaser.Scene {
  constructor() {
    super("preloader");
  }

  preload() {
    // 던전 맵 tiles 불러오기
    this.load.image("tiles", "assets/dungeon_tile_extruded.png");
    this.load.tilemapTiledJSON("dungeon", "assets/tiles/dungeon-01.json");

    // 캐릭터(플레이어) png, json 불러오기
    this.load.atlas(
      "faune",
      "assets/character/faune.png",
      "assets/character/faune.json"
    );
    // 적(Lizard) png, json 불러오기
    this.load.atlas(
      "lizard",
      "assets/enemies/lizard.png",
      "assets/enemies/lizard.json"
    );
    // 상자 png, json 불러오기
    this.load.atlas(
      "treasure",
      "assets/items/treasure.png",
      "assets/items/treasure.json"
    );

    // 하트 이미지 불러오기
    this.load.image("ui-heart-empty", "assets/ui/heart_empty.png");
    this.load.image("ui-heart-full", "assets/ui/heart_full.png");

    // 칼 이미지
    this.load.image("knife", "assets/ui/knife.png");
  }

  create() {
    this.scene.start("game");
  }
}
