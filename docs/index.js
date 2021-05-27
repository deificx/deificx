function request(action) {
  const params = new URLSearchParams(action).toString();
  return fetch(
    `https://7po1em59g7.execute-api.eu-central-1.amazonaws.com/default/instagram-gateway?${params}`,
    { credentials: "include" }
  )
    .then((res) => {
      console.log(res);
      return res;
    })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((reason) => console.error(reason));
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    login({ action: "login", code });
  }
}

init();

const profile = () => request({ action: "list_profile" });
const media = () => request({ action: "list_media" });
