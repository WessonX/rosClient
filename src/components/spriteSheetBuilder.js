/* eslint-disable no-undef */
let cache = new Map();
function mySprite(shape, size, shapeFrameFunction, name) {
  return new Promise(resolve => {
    let sheet = cache.get(name);
    if (sheet) {
      resolve(sheet);
    } else {
      let spritesheetBuilder = new createjs.SpriteSheetBuilder();
      let rect =
        size instanceof createjs.Rectangle
          ? size
          : new createjs.Rectangle(-size, -size, 2 * size, 2 * size);
      spritesheetBuilder.addFrame(shape, rect, 1, shapeFrameFunction);
      spritesheetBuilder.on("complete", function() {
        console.log(`build ${name} complete!`);
        spritesheetBuilder.stopAsync();
        cache.set(name, spritesheetBuilder.spriteSheet);
        resolve(spritesheetBuilder.spriteSheet);
      });
      spritesheetBuilder.buildAsync();
    }
  });
}
function clear() {
  cache.clear();
}
export { mySprite, clear };
