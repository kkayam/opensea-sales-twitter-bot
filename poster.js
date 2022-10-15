const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const exp = require("constants");
const fs = require("fs");

let roundRect = (ctx, x0, y0, x1, y1, r) => {
  var w = x1 - x0;
  var h = y1 - y0;
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x1 - r, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
  ctx.lineTo(x1, y1 - r);
  ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
  ctx.lineTo(x0 + r, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
  ctx.fill();
};

function logo(ctx, canvas, y) {
  ctx.font = "25px ";
  var logo = "@ENSEmojiSales";
  textDim = ctx.measureText(logo);
  ctx.fillText(logo, canvas.width / 2 - textDim.width / 2, y + 55);
  ctx.font = "70px Apple Emoji";
  var logo = "😜";
  textDim = ctx.measureText(logo);
  ctx.fillText(logo, canvas.width / 2 - textDim.width / 2, y + 25);
}

function draw_poster(ens, eth, usd) {
  GlobalFonts.registerFromPath("./AppleColorEmoji@2x.ttf", "Apple Emoji");

  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext("2d");
  ctx.font = "50px ";

  const texts = ["Sale!", ens, eth + "Ξ", "$" + usd];

  ctx.fillStyle = "#fec33d";
  ctx.beginPath();
  ctx.rect(0, 0, 600, 600);
  ctx.fill();

  ctx.fillStyle = "black";
  ctx.font = "bold 50px ";
  texts.forEach((str, i) => {
    textDim = ctx.measureText(str);
    let actualHeight =
      textDim.actualBoundingBoxAscent + textDim.actualBoundingBoxDescent;

    let x = canvas.width / 2 - textDim.width / 2;
    let y = i * 80 + 190;
    if (i == 0) {
      y -= 50;
    }
    if (i == 1) {
      ctx.font = "50px Apple Emoji";
      ctx.fillText(str, x, y);
      ctx.font = "50px ";
      var new_str = ".eth";
      var new_textDim = ctx.measureText(new_str);
      var new_x = x + textDim.width - new_textDim.width;
      ctx.fillText(new_str, new_x, y);
    }
    if (i == 2) {
      ctx.fillStyle = "#eeb133";
      roundRect(
        ctx,
        x - 10,
        y - actualHeight - 10,
        x + textDim.width + 10,
        y + 10,
        10
      );

      ctx.fillStyle = "black";
    }
    if (i == 3) {
      ctx.font = "17px ";
      textDim = ctx.measureText(str);
      actualHeight =
        textDim.actualBoundingBoxAscent + textDim.actualBoundingBoxDescent;

      x = canvas.width / 2 - textDim.width / 2;
      y = i * 80 + 145;
    }
    ctx.fillText(str, x, y);
    ctx.font = "50px ";
  });

  logo(ctx, canvas, 500);

  const buffer = canvas.toBuffer("image/png");
  return buffer;
}

module.exports = { draw_poster };
