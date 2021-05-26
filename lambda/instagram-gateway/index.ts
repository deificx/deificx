import type { APIGatewayProxyEventV2 } from "aws-lambda";
// import AWS from "aws-sdk";
import https from "https";
import querystring from "querystring";

// const s3 = new AWS.S3({
//   region: process.env["AWS_REGION"],
//   apiVersion: "2012-10-17",
// });

const res = (data: unknown, statusCode = 200) => ({
  body: JSON.stringify(data, null, 2),
  statusCode,
});

exports.handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const data = await parse(event);
    console.log(data);
    return res(data);
  } catch (reason) {
    console.error(reason);
    return res(reason, 500);
  }
};

async function parse(event: APIGatewayProxyEventV2) {
  console.log(event);
  const {
    requestContext: {
      http: { method },
    },
  } = event;
  if (method === "OPTIONS") {
    return Promise.resolve({});
  }
  if (method === "POST") {
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
      return fetch(
        "https://api.instagram.com/oauth/access_token",
        { method: "POST" },
        {
          client_id: process.env["INSTAGRAM_APP_ID"],
          client_secret: process.env["INSTAGRAM_APP_SECRET"],
          code: pick(payload, "code"),
          grant_type: "authorization_code",
          redirect_uri: "https://deificx.alander.dev/",
        }
      );

    case "long_lived_token": {
      return fetch(
        `https://graph.instagram.com/access_token`,
        { method: "GET" },
        {
          grant_type: "ig_exchange_token",
          client_secret: process.env["INSTAGRAM_APP_SECRET"],
          access_token: pick(payload, "accessToken"),
        }
      );
    }

    case "list_media": {
      const userID = pick(payload, "userID");
      return fetch(
        `https://graph.instagram.com/${userID}/media`,
        { method: "GET" },
        {
          fields:
            "caption,id,media_type,media_url,permalink,thumbnail_url,timestamp,username",
          access_token: pick(payload, "accessToken"),
        }
      );
    }

    case "list_profile": {
      const userID = pick(payload, "userID");
      return fetch(
        `https://graph.instagram.com/${userID}`,
        { method: "GET" },
        {
          fields: "id,media_count,username",
          access_token: pick(payload, "accessToken"),
        }
      );
    }

    default:
      return Promise.reject("not implemented");
  }
}

function fetch(
  url: string,
  options: https.RequestOptions,
  data?: querystring.ParsedUrlQueryInput
) {
  const postData = querystring.stringify(data);
  let href = url;

  if (options.method === "POST") {
    if (!options.headers) {
      options.headers = {};
    }

    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.headers["Content-Length"] = Buffer.byteLength(postData);
  } else {
    href += postData;
  }

  console.log(`fetch [${options.method}] - ${href}`);

  return new Promise((resolve, reject) => {
    const req = https.request(href, options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

      let data = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("error", (error) => console.error(error.message));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (reason) {
          reject(reason);
        }
      });
    });

    req.on("error", (error) => {
      console.error(`problem with request: ${error.message}`);
      reject(error);
    });

    if (options.method === "POST") {
      req.write(postData);
    }

    req.end();
  });
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
