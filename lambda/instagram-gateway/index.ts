import type { APIGatewayProxyEventV2 } from "aws-lambda";
// import AWS from "aws-sdk";
import https from "https";
import querystring from "querystring";

const INSTAGRAM_APP_ID = process.env["INSTAGRAM_APP_ID"];
const INSTAGRAM_APP_SECRET = process.env["INSTAGRAM_APP_SECRET"];

// const s3 = new AWS.S3({
//   region: process.env["AWS_REGION"],
//   apiVersion: "2012-10-17",
// });

exports.handler = (event: APIGatewayProxyEventV2) =>
  new Promise((resolve) => {
    parse(event)
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

async function parse(event: APIGatewayProxyEventV2) {
  console.log(event);
  if (event.requestContext.http.method === "POST") {
    const action = event.queryStringParameters?.["action"];
    const payload = JSON.parse(event.body as string);
    const result = await instagramActions(action ?? "", payload);
    return { action, payload, result };
  }
  return Promise.reject("only POST actions supported");
}

function instagramActions(action: string, payload: unknown) {
  console.log(`performing action: ${action}`);
  switch (action) {
    case "short_lived_token":
      return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          code: pick(payload, "code"),
          grant_type: "authorization_code",
          redirect_uri: "https://deificx.alander.dev/",
        });

        const options = {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData),
          },
          href: "https://api.instagram.com/oauth/access_token",
        };

        const req = https.request(options, (res) => {
          console.log(`STATUS: ${res.statusCode}`);
          console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

          let data = "";

          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (reason) {
              reject(reason);
            }
          });
        });

        req.on("error", (e) => {
          console.error(`problem with request: ${e.message}`);
        });

        req.write(postData);
        req.end();
      });

    case "long_lived_token":
      return Promise.reject("not implemented");

    case "list_media":
      return Promise.reject("not implemented");

    case "list_profile":
      return Promise.reject("not implemented");

    default:
      return Promise.reject("not implemented");
  }
}

function pick(object: unknown, key: string): string {
  if (
    typeof object === "object" &&
    !!object &&
    Object.hasOwnProperty.call(object, key)
  ) {
    return (object as { [key: string]: string })[key] ?? "";
  }
  return "";
}
