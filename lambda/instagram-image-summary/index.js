"use strict";

const { readFile, readdir } = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { createCanvas, registerFont } = require("canvas");

registerFont("RockSalt-Regular.ttf", { family: "Rock Salt" });

const p = (...parts) => path.resolve(__dirname, "..", "..", ...parts);
const c = (file) => readFile(p("instagram", file));

readMeta()
  .then((meta) => {
    meta.sort((a, b) => b.date.valueOf() - a.date.valueOf());
    return meta;
  })
  .then(createDateImage)
  .then(composition)
  .catch((reason) => console.error(reason));

async function readMeta() {
  const files = await readdir(p("instagram"));
  return Promise.all(
    files.filter((file) => path.extname(file) === ".json").map(c)
  )
    .then((contents) => contents.map((content) => JSON.parse(content)))
    .then((contents) =>
      Promise.all(
        contents.map(async (content) => {
          content.imageBuffer = await c(`${content.id}.jpg`);
          content.date = new Date(content.timestamp);
          return content;
        })
      )
    );
}

function composition(meta) {
  return sharp({
    create: {
      background: { r: 0, g: 0, b: 0 },
      channels: 3,
      height: 256,
      width: 768,
    },
  })
    .composite(
      meta.map((content, idx) => ({
        input: content.imageBuffer,
        top: 0,
        left: (idx % 3) * 256,
      }))
    )
    .toFile(p("instagram", "output.jpg"));
}

function createDateImage(meta) {
  const dates = meta.map(({ date }) => date);
  const x = 8;
  const y = 256 - 16;
  for (const date of dates) {
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext("2d");
    const text = formatDate(date);
    // ctx.rotate(-0.2);
    ctx.font = "16px Rock Salt";
    ctx.fillStyle = "black";
    ctx.fillText(text, x - 1, y - 1);
    ctx.fillStyle = "white";
    ctx.fillText(text, x, y);
    meta.push({ imageBuffer: canvas.toBuffer("image/png") });
  }
  return meta;
}

function formatDate(date) {
  const pr = new Intl.PluralRules("en-US", { type: "ordinal" });
  const dt = new Intl.DateTimeFormat("en-US", { month: "long" });

  const suffixes = {
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  };

  const monthDay = date.getDate();
  return `${monthDay}${suffixes[pr.select(monthDay)]} of ${dt.format(date)}`;
}
