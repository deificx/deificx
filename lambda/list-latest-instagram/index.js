"use strict";

const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  apiVersion: "2012-10-17",
});

exports.handler = (event) =>
  new Promise((resolve) => {
    listFromBucket(event)
      .then(filterJSON)
      .then(readFiles)
      .then(sortAndSlice)
      .then((data) => {
        resolve({
          body: JSON.stringify(data, null, 2),
          headers: { "content-type": "application/json; charset=utf-8" },
          statusCode: 200,
        });
      })
      .catch((reason) => {
        console.error(reason);
        resolve({
          body: JSON.stringify(reason, null, 2),
          headers: { "content-type": "application/json; charset=utf-8" },
          statusCode: 500,
        });
      });
  });

function listFromBucket() {
  return s3
    .listObjectsV2({
      Bucket: "alander",
      Prefix: "instagram/",
    })
    .promise();
}

function filterJSON(response) {
  return Promise.resolve(
    response.Contents.filter((data) => data.Key.endsWith(".json")).map(
      (data) => ({
        Key: data.Key,
        LastModified: new Date(data.LastModified),
      })
    )
  );
}

function readFiles(fileList) {
  return Promise.all(fileList.map(({ Key }) => readFile(Key)));
}

function readFile(Key) {
  return new Promise(function onReadFile(resolve, reject) {
    let data = "";

    const readStream = s3
      .getObject({
        Bucket: "alander",
        Key,
      })
      .createReadStream();

    readStream.on("data", (chunk) => (data += chunk.toString()));

    readStream.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        resolve({
          caption: parsed.caption || "",
          id: parsed.id || Key,
          media_url:
            "https://alander.s3.eu-central-1.amazonaws.com/" +
            Key.replace(".json", ".jpg"),
          permalink: parsed.permalink || "",
          timestamp: new Date(parsed.timestamp),
          thumbnail:
            "https://alander.s3.eu-central-1.amazonaws.com/" +
            Key.replace(".json", "_thumbnail.jpg"),
        });
      } catch (reason) {
        reject(reason);
      }
    });
  });
}

function sortAndSlice(dataList) {
  return Promise.resolve(
    dataList
      .sort((a, b) => b.timestamp.valueOf() - a.timestamp.valueOf())
      .slice(0, 3)
  );
}
