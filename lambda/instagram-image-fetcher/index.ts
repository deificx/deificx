"use strict";

import type { NotificationEvent, Record } from "./NotificationEvent";
import type { InstagramEvent, ImageEvent, ResizeEvent } from "./InstagramEvent";

import AWS from "aws-sdk";
import https from "https";
import sharp from "sharp";
import { Transform as Stream } from "stream";

const s3 = new AWS.S3({
  region: process.env["AWS_REGION"],
  apiVersion: "2012-10-17",
});

exports.handler = (event: NotificationEvent) =>
  Promise.all(event.Records.map(parse));

function parse(record: Record) {
  return s3
    .getObject({
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    })
    .promise()
    .then((data) => {
      console.log(typeof data);
      console.log(data);
      if (!data.Body) {
        throw new Error("no content");
      }
      return JSON.parse(data.Body.toString());
    })
    .then(downloadImage)
    .then(resizeImage)
    .then(uploadAll);
}

function downloadImage(event: InstagramEvent): Promise<ImageEvent> {
  console.log(`download image (${event.id}) from ${event.media_url}`);
  return new Promise(function imageDownloader(resolve) {
    https
      .request(event.media_url, function responseHandler(response) {
        console.log(JSON.stringify(response.headers, null, 2));
        const file = new Stream();

        response.on("data", (chunk) => file.push(chunk));

        response.on("end", () => {
          resolve({ ...event, image: file.read() });
        });
      })
      .end();
  });
}

async function resizeImage(event: ImageEvent): Promise<ResizeEvent> {
  console.log("resizing image");
  return {
    ...event,
    resizedImage: await sharp(event.image).resize(256).toBuffer(),
  };
}

function uploadAll(event: ResizeEvent) {
  console.log("saving images");
  console.log(JSON.stringify(event, null, 2));
  return Promise.all([
    putToS3({
      Key: `${event.id}.jpg`,
      Body: event.image,
      Bucket: "alander/instagram/image",
      ContentType: "image/jpeg",
    }),
    putToS3({
      Key: `${event.id}.jpg`,
      Body: event.resizedImage,
      Bucket: "alander/instagram/thumbnail",
      ContentType: "image/jpeg",
    }),
  ]);
}

function putToS3({ Key, Body, Bucket, ContentType }: AWS.S3.PutObjectRequest) {
  console.log(
    `uploading Key=${Key}, typeof Body = ${typeof Body}, ContentType = ${ContentType}`
  );

  return s3
    .putObject({
      ACL: "public-read",
      Body,
      Bucket,
      ContentType,
      Key,
    })
    .promise();
}
