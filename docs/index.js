function login(code) {
  return fetch(
    `https://7po1em59g7.execute-api.eu-central-1.amazonaws.com/default/instagram-gateway?action=login&code=${code}`
  )
    .then((res) => {
      console.log(res);
      return res;
    })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((reason) => console.error(reason));
}

function get(action) {
  return fetch(
    `https://7po1em59g7.execute-api.eu-central-1.amazonaws.com/default/instagram-gateway?action=${action}`,
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
    login(code);
  }
}

init();
