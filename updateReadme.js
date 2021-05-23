const fs = require("fs");
const https = require("https");
const path = require("path");

const target =
  "https://hakv41dzke.execute-api.eu-central-1.amazonaws.com/default/list-latest-instagram";

getLatestInstagram()
  .then(calculateDiff)
  .then(actions)
  .then(getInstagramData)
  .then(writeReadme)
  .catch((reason) => console.error(reason));

function getLatestInstagram() {
  return new Promise(function onGetLatestInstagram(resolve, reject) {
    https
      .get(target, (res) => {
        console.log(
          `target = ${target}, statusCode = ${res.statusCode}, content-type = ${res.headers["content-type"]}`
        );

        let rawData = "";

        res.on("data", (chunk) => (rawData += chunk));

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (reason) {
            reject(reason);
          }
        });
      })
      .on("error", (reason) => {
        reject(reason);
      });
  });
}

function calculateDiff(list) {
  return fs.promises
    .readdir(path.resolve(__dirname, "instagram"))
    .then((files) => {
      const fileIds = [
        ...new Set(
          files.map((file) => {
            const ext = path.extname(file);
            const name = file.replace(ext, "");
            return name;
          })
        ),
      ];
      const remoteIds = list.map(({ id }) => id);
      return {
        add: remoteIds
          .filter((id) => !fileIds.includes(id))
          .map((id) => list.find((item) => item.id === id)),
        remove: fileIds.filter((id) => !remoteIds.includes(id)),
      };
    });
}

function actions({ add, remove }) {
  console.log({ add, remove });
  return Promise.all(add.map(downloadImage).concat(remove.map(deleteImage)));
}

function deleteImage(id) {
  console.log(`deleting ${id}`);
  const paths = ["jpg", "json"].map((ext) => getPath(id, ext));
  return Promise.all(paths.map((p) => fs.promises.unlink(p))).then(() => ({
    action: "delete",
    id,
  }));
}

function downloadImage(data) {
  console.log(`adding ${data.id}`);
  return new Promise(function onDownloadImage(resolve, reject) {
    https
      .request(data.thumbnail, function responseHandler(response) {
        console.log(
          `target = ${data.thumbnail}, statusCode = ${response.statusCode}, content-type = ${response.headers["content-type"]}`
        );

        const stream = fs.createWriteStream(getPath(data.id, "jpg"));

        response.pipe(stream);

        response.on("end", function () {
          fs.promises
            .writeFile(getPath(data.id, "json"), JSON.stringify(data, null, 2))
            .then(() => resolve({ ...data, action: "download" }));
        });

        stream.on("error", function (error) {
          reject(error);
        });
      })
      .end();
  });
}

function getPath(id, ext) {
  return path.resolve(__dirname, "instagram", `${id}.${ext}`);
}

async function getInstagramData() {
  const contents = [];
  const files = await fs.promises.readdir(path.resolve(__dirname, "instagram"));
  for (const file of files) {
    const ext = path.extname(file);
    if (ext === ".json") {
      contents.push(
        JSON.parse(
          await fs.promises.readFile(
            getPath(file.replace(ext, ""), "json"),
            "utf-8"
          )
        )
      );
    }
  }
  return contents.sort(
    (a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf()
  );
}

async function writeReadme(list) {
  const lines = list.flatMap((item) => [
    `## ${new Date(item.timestamp).toString()}`,
    "",
    `[![](https://github.com/deificx/deificx/blob/main/instagram/${item.id}.jpg)](${item.permalink})`,
    "",
    item.caption,
    "",
  ]);
  return fs.promises.writeFile(
    path.resolve(__dirname, "README.md"),
    lines.join("\n"),
    "utf-8"
  );
}
