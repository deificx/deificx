import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
// import AWS from "aws-sdk";
import https from "https";
import querystring from "querystring";

// const s3 = new AWS.S3({
//   region: process.env["AWS_REGION"],
//   apiVersion: "2012-10-17",
// });

interface Response {
  body: Record<string, string>;
  cookies?: string[];
}

const res = ({
  body,
  cookies,
  statusCode = 200,
}: {
  body?: unknown;
  cookies?: string[];
  statusCode?: number;
}): APIGatewayProxyResultV2 => {
  const res = {
    body: body ? JSON.stringify(body, null, 2) : undefined,
    cookies,
    headers: {
      "content-type": "application/json",
    },
    statusCode,
  };
  console.log(res);
  return res;
};

exports.handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    return await parse(event);
  } catch (reason) {
    console.error(reason);
    return res({ body: reason, statusCode: 500 });
  }
};

async function parse(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  console.log(event);

  const {
    cookies,
    requestContext: {
      http: { method },
    },
  } = event;

  if (method === "GET") {
    const action = event.queryStringParameters?.["action"];
    const token =
      event.queryStringParameters?.["code"] ??
      extractAccessTokenFromCookie(cookies ?? []);
    const result = await instagramActions(action ?? "", token);
    return res(result);
  }

  return Promise.reject("only GET actions supported");
}

function instagramActions(action: string, token: string): Promise<Response> {
  console.log(`performing action: ${action}`);
  switch (action) {
    case "login":
      return fetch(
        "https://api.instagram.com/oauth/access_token",
        { method: "POST" },
        {
          client_id: process.env["INSTAGRAM_APP_ID"],
          client_secret: process.env["INSTAGRAM_APP_SECRET"],
          code: token,
          grant_type: "authorization_code",
          redirect_uri: "https://deificx.alander.dev/",
        }
      )
        .then(async (result) => {
          const { access_token } = result.body;

          if (!access_token) {
            throw new Error("couldn't retrieve access_token from result");
          }

          try {
            return await fetch(
              `https://graph.instagram.com/access_token`,
              { method: "GET" },
              {
                grant_type: "ig_exchange_token",
                client_secret: process.env["INSTAGRAM_APP_SECRET"],
                access_token,
              }
            );
          } catch (reason) {
            console.error(reason);
            return result;
          }
        })
        .then((result: Response) => {
          result.cookies = [
            `__Host-access_token=${result.body["access_token"]}; HttpOnly; Path=/; SameSite=Strict; Secure`,
          ];
          return result;
        });

    case "list_media": {
      return fetch(
        `https://graph.instagram.com/me/media`,
        { method: "GET" },
        {
          fields:
            "caption,id,media_type,media_url,permalink,thumbnail_url,timestamp,username",
          access_token: token,
        }
      );
    }

    case "list_profile": {
      return fetch(
        `https://graph.instagram.com/me`,
        { method: "GET" },
        {
          fields: "id,media_count,username",
          access_token: token,
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
): Promise<{ body: Record<string, string> }> {
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
      console.log(`STATUS: ${res.statusCode}, ${res.statusMessage}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

      let data = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => (data += chunk));
      res.on("error", (error) => console.error(error.message));
      res.on("end", () => {
        try {
          console.log(data);
          resolve({ body: JSON.parse(data) });
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

function extractAccessTokenFromCookie(cookies: string[]): string {
  const record = cookies.reduce((acc, cur) => {
    const [key, val] = cur.split("=");
    if (key && val) {
      return { ...acc, [key]: val };
    }
    return acc;
  }, {} as Record<string, string>);
  return record["__Host-access_token"] ?? "";
}
