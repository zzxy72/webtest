import Phaser from "phaser";

import { debugDraw } from "../../utils/debug";
import { createLizardAnims } from "../../anims/EnemyAnims";
import { createCharacterAnims } from "../../anims/CharacterAnims";
import { createChestAnims } from "../../anims/TreasureAnims";

import Lizard from "../../enemies/Lizard";

import "../../characters/Faune";
import Faune from "../../characters/Faune";

import { sceneEvents } from "../../events/EventCenter";
import Chest from "../../items/Chest";

export default class Game extends Phaser.Scene {
  // 키보드 입력 변수 선언
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  // 플레이어 변수 선언
  private faune!: Faune;
  // knives 그룹 변수 선언
  private knives!: Phaser.Physics.Arcade.Group;
  // lizards 그룹 변수 선언
  private lizards!: Phaser.Physics.Arcade.Group;

  // 플레이어/적 collider 적용 여부 (사망시 collider 미적용 그런거)
  private playerLizardCollider?: Phaser.Physics.Arcade.Collider;

  private hit = 0; // 프레임카운트

  constructor() {
    super("game");
  }

  preload() {
    // 키보드 입력 변수
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  create() {
    // game ui
    this.scene.run("game-ui");

    // 적 (lizard) 애니메이션 설정
    createLizardAnims(this.anims);
    // 플레이어 애니메이션 설정
    createCharacterAnims(this.anims);
    // 상자 애니메이션 설정
    createChestAnims(this.anims);

    const map = this.make.tilemap({ key: "dungeon" });
    const tileset = map.addTilesetImage("dungeon", "tiles", 16, 16, 1, 2);

    // knives Object Pool
    this.knives = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 3, // 칼 최대개수
    });

    map.createLayer("Ground", tileset); // 땅
    const wallsLayer = map.createLayer("Walls", tileset); // 벽

    map.createLayer("Ground", tileset);

    wallsLayer.setCollisionByProperty({ collide: true }); // Tiled 에서 생성한 map에서 colides:true 로 설정한 값은 collide 적용

    // 상자 배치
    const chests = this.physics.add.staticGroup({
      classType: Chest,
    });
    const chestsLayer = map.getObjectLayer("Chests");
    chestsLayer.objects.forEach((chestObj) => {
      chests.get(
        chestObj.x! + chestObj.width! * 0.5,
        chestObj.y! - chestObj.height! * 0.5,
        "treasure",
        "chest_empty_open_anim_f0.png"
      );
    });

    //// 물체에 collide 적용되있는지 확인하는 디버그 그래픽
    // debugDraw(wallsLayer, this);

    this.faune = this.add.faune(128, 128, "faune"); // 플레이어 배치
    this.faune.setKnives(this.knives); // 플레이어가 칼 던지게 가능

    // // 캐릭터(플레이어) 불러오기 , physics 적용 (그냥 this.add.sprite 로 하면 collide 적용 안됨)
    // this.faune = this.physics.add.sprite(128, 128, "faune", "walk-down-3.png");
    // this.faune.body.setSize(this.faune.width * 0.5, this.faune.height * 0.8); // 캐릭터에 적용된 collide box를 재설정
    // this.faune.anims.play("faune-idle-side"); // 기본 플레이어 자세 설정

    // 카메라 자동으로 따라오게
    this.cameras.main.startFollow(
      this.faune,
      true,
      undefined,
      undefined,
      -300,
      20
    );

    // 적 배치
    this.lizards = this.physics.add.group({
      classType: Lizard,
      createCallback: (go) => {
        const lizGo = go as Lizard;
        lizGo.body.onCollide = true;
      },
    });
    const lizardsLayer = map.getObjectLayer("Lizards");
    lizardsLayer.objects.forEach((LizObj) => {
      this.lizards.get(
        LizObj.x! + LizObj.width!,
        LizObj.y! - LizObj.height! * 0.5,
        "lizard"
      );
    });
    this.lizards.get(256, 128, "lizard");
    //const lizard = this.physics.add.sprite(256,128,"lizard","lizard_m_idle_f0");
    //lizard.anims.play("lizard-run");

    // collider 적용
    this.physics.add.collider(this.faune, wallsLayer); // 플레이어/벽
    this.physics.add.collider(this.lizards, wallsLayer); // lizards/벽
    this.physics.add.collider(
      // 플레이어/상자
      this.faune,
      chests,
      this.handlePlayerChsetCollision,
      undefined,
      this
    );

    this.physics.add.collider(
      // 칼/벽
      this.knives,
      wallsLayer,
      this.handleKnifeWallCollision,
      undefined,
      this
    );
    this.physics.add.collider(
      // 칼/lizards
      this.knives,
      this.lizards,
      this.handleKnifeLizardCollision,
      undefined,
      this
    );

    this.playerLizardCollider = this.physics.add.collider(
      // lizards/플레이어
      this.lizards,
      this.faune,
      this.handlePlayerLizardCollision,
      undefined,
      this
    );
  }

  // 플레이어, 상자 두 물체 충돌시
  private handlePlayerChsetCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const chest = obj2 as Chest;
    this.faune.setChest(chest);
  }

  // 플레이어, lizard 두 물체가 충돌시
  private handlePlayerLizardCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const lizard = obj2 as Lizard;

    const dx = this.faune.x - lizard.x;
    const dy = this.faune.y - lizard.y;

    const dir = new Phaser.Math.Vector2(dx, dy).normalize().scale(200);
    this.faune.handleDamage(dir);

    sceneEvents.emit("player-health-changed", this.faune.health);

    if (this.faune.health <= 0) {
      this.playerLizardCollider?.destroy();
    }
  }

  // 칼, 벽 두 물체가 충돌시
  private handleKnifeWallCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    this.knives.killAndHide(obj1);
  }

  // 칼, 도마뱀 두 물체가 충돌시
  private handleKnifeLizardCollision(
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    this.knives.killAndHide(obj1);
    this.lizards.killAndHide(obj2);
    obj2.destroy();
    obj1.destroy();
  }

  update(t: number, dt: number) {
    if (this.hit > 0) {
      // 플레이어와 적 충돌시 ++프레임카운트, 카운트가 10되면 정지
      ++this.hit;
      if (this.hit > 10) {
        this.hit = 0;
      }
      return;
    }
    if (this.faune) {
      this.faune.update(this.cursors);
    }
  }
}
