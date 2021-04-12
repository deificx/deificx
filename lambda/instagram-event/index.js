"use strict";

const AWS = require("aws-sdk");
const https = require("https");
const sharp = require("sharp");
const Stream = require("stream").Transform;

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  apiVersion: "2012-10-17",
});

exports.handler = (event) =>
  new Promise((resolve) => {
    parse(event)
      .then(downloadImage)
      .then(resizeImage)
      .then(uploadAll)
      .then((data) => {
        resolve({ body: JSON.stringify(data, null, 2), statusCode: 200 });
      })
      .catch((reason) => {
        console.error(reason);
        resolve({
          statusCode: 500,
          body: JSON.stringify(reason, null, 2),
        });
      });
  });

function parse(event) {
  return new Promise(function jsonParse(resolve, reject) {
    try {
      console.log(JSON.stringify(event.headers, null, 2));
      const data = JSON.parse(event.body);
      console.log(JSON.stringify(data, null, 2));
      resolve(data);
    } catch (reason) {
      reject(reason);
    }
  });
}

function downloadImage(data) {
  return new Promise(function imageDownloader(resolve) {
    https
      .request(data.media_url, function responseHandler(response) {
        console.log(JSON.stringify(response.headers, null, 2));
        const file = new Stream();

        response.on("data", (chunk) => file.push(chunk));

        response.on("end", () => {
          resolve({ ...data, image: file.read() });
        });
      })
      .end();
  });
}

async function resizeImage(data) {
  console.log("resizing");
  return {
    ...data,
    resizedImage: await sharp(data.image).resize(256).toBuffer(),
  };
}

function uploadAll(data) {
  const { image, resizedImage } = data;
  delete data.image;
  delete data.resizedImage;

  return Promise.all([
    putToS3({
      Key: `${data.id}.json`,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json; charset=utf-8",
    }),
    putToS3({
      Key: `${data.id}.jpg`,
      Body: image,
      ContentType: "image/jpeg",
    }),
    putToS3({
      Key: `${data.id}_thumbnail.jpg`,
      Body: resizedImage,
      ContentType: "image/jpeg",
    }),
  ]);
}

function putToS3({ Key, Body, ContentType }) {
  console.log(
    `uploading Key=${Key}, typeof Body = ${typeof Body}, ContentType = ${ContentType}`
  );

  return s3
    .putObject({
      ACL: "public-read",
      Body,
      Bucket: "alander/instagram",
      ContentType,
      Key,
    })
    .promise();
}
