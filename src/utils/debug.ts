const debugDraw = (
  wallsLayer: Phaser.Tilemaps.TilemapLayer,
  scene: Phaser.Scene
) => {
  // 물체에 collide 적용되있는지 확인하는 디버그 그래픽
  const debugGraphics = scene.add.graphics().setAlpha(0.7);
  wallsLayer.renderDebug(debugGraphics, {
    tileColor: null,
    collidingTileColor: new Phaser.Display.Color(243, 234, 48, 255),
    faceColor: new Phaser.Display.Color(40, 39, 37, 255),
  });
};

export { debugDraw };
