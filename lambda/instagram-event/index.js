"use strict";

const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  apiVersion: "2012-10-17",
});

exports.handler = (event) =>
  new Promise((resolve) => {
    parse(event)
      .then(saveMeta)
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

function saveMeta(data) {
  return putToS3({
    Key: `${data.id}.json`,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json; charset=utf-8",
  });
}

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

function putToS3({ Key, Body, ContentType }) {
  console.log(
    `uploading Key=${Key}, typeof Body = ${typeof Body}, ContentType = ${ContentType}`
  );

  return s3
    .putObject({
      ACL: "public-read",
      Body,
      Bucket: "alander/instagram/meta",
      ContentType,
      Key,
    })
    .promise();
}
