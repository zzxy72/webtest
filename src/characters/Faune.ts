import Phaser from "phaser";
import Chest from "../items/Chest";

import { sceneEvents } from "../events/EventCenter";

declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      faune(
        x: number,
        y: number,
        texture: string,
        frame?: string | number
      ): Faune;
    }
  }
}
enum HealthState {
  IDLE,
  DAMAGE,
  DEAD,
}

export default class Faune extends Phaser.Physics.Arcade.Sprite {
  private healthState = HealthState.IDLE;
  private damageTime = 0;

  private _health = 3;
  private _coins = 0;

  private knives?: Phaser.Physics.Arcade.Group;
  private activeChest?: Chest;

  get health() {
    return this._health;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    this.anims.play("faune-idle-down");
  }

  setKnives(knives: Phaser.Physics.Arcade.Group) {
    this.knives = knives;
  }

  setChest(chest: Chest) {
    this.activeChest = chest;
  }

  handleDamage(dir: Phaser.Math.Vector2) {
    if (this._health <= 0) {
      // 사망 시
      return;
    }

    if (this.healthState === HealthState.DAMAGE) {
      return;
    }

    --this._health;

    if (this._health <= 0) {
      // 사망 시
      this.healthState = HealthState.DEAD;
      this.anims.play("faune-faint");
      this.setVelocity(0, 0);
    } else {
      // 적에게 부딪혔을시
      this.setVelocity(dir.x, dir.y);

      this.setTint(0xff0000);

      this.healthState = HealthState.DAMAGE;
      this.damageTime = 0;
    }
  }

  private throwKnife() {
    if (!this.knives) {
      return;
    }
    const knife = this.knives?.get(
      this.x,
      this.y,
      "knife"
    ) as Phaser.Physics.Arcade.Image;
    if (!knife) {
      return; // Game.ts 의 Knives에 적힌 maxSize 에 적힌대로 개수 제한
    }
    const parts = this.anims.currentAnim.key.split("-");
    const direction = parts[2];

    const vec = new Phaser.Math.Vector2(0, 0);

    // 칼 던지는 위치에 따라 칼 이미지 모션 조정
    switch (direction) {
      case "up":
        vec.y = -1;
        break;
      case "down":
        vec.y = 1;
        break;
      default:
      case "side":
        if (this.scaleX < 0) {
          vec.x = -1;
        } else {
          vec.x = 1;
        }
        break;
    }
    const angle = vec.angle();

    knife.setActive(true);
    knife.setVisible(true);

    knife.setRotation(angle);
    knife.x += vec.x * 16;
    knife.y += vec.y * 16;
    knife.setVelocity(vec.x * 300, vec.y * 300);
  }

  preUpdate(t: number, dt: number) {
    super.preUpdate(t, dt);
    switch (this.healthState) {
      case HealthState.IDLE:
        break;
      case HealthState.DAMAGE:
        this.damageTime += dt;
        if (this.damageTime >= 250) {
          this.healthState = HealthState.IDLE;
          this.setTint(0xffffff);
          this.damageTime = 0;
        }
        break;
    }
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    if (
      this.healthState === HealthState.DAMAGE ||
      this.healthState === HealthState.DEAD
    ) {
      // 데미지를 입거나 죽었을때
      return;
    }

    // 커서(키보드) 안눌러졌으면 -> 리턴(암것도안함)
    if (!cursors) return;

    // 스페이스바 누르면 칼투척
    if (Phaser.Input.Keyboard.JustDown(cursors.space!)) {
      if (this.activeChest) {
        const coins = this.activeChest.open();
        this._coins += coins;

        sceneEvents.emit("player-coins-changed", this._coins);
      } else {
        this.throwKnife();
      }
      return;
    }

    const speed = 100;

    const leftDown = cursors.left?.isDown;
    const rightDown = cursors.right?.isDown;
    const upDown = cursors.up?.isDown;
    const downDown = cursors.down?.isDown;

    if (leftDown) {
      this.anims.play("faune-run-side", true);
      this.setVelocity(-speed, 0);
      // 좌우반전
      this.scaleX = -1;
      this.body.offset.x = 24; // 위에 scaleX로 바뀐 offset 을 재설정, 이거 없으면 캐릭터에 적용된 collider box가 밖으로 밀림
    } else if (rightDown) {
      this.anims.play("faune-run-side", true);
      this.setVelocity(speed, 0);

      this.scaleX = 1;
      this.body.offset.x = 8; // 위에 offset 원상복귀
    } else if (upDown) {
      this.anims.play("faune-run-up", true);
      this.setVelocity(0, -speed);
    } else if (downDown) {
      this.anims.play("faune-run-down", true);
      this.setVelocity(0, speed);
    } else {
      const parts = this.anims.currentAnim.key.split("-");
      parts[1] = "idle";
      this.anims.play(parts.join("-"));
      this.setVelocity(0, 0);
    }
    if (leftDown || rightDown || upDown || downDown) {
      this.activeChest = undefined;
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  "faune",
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    var sprite = new Faune(this.scene, x, y, texture, frame);

    this.displayList.add(sprite);
    this.updateList.add(sprite);

    this.scene.physics.world.enableBody(
      sprite,
      Phaser.Physics.Arcade.DYNAMIC_BODY
    );

    sprite.body.setSize(sprite.width * 0.5, sprite.height * 0.8);

    return sprite;
  }
);
