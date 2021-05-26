const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (code) {
  console.log(code);
  fetch(
    "https://7po1em59g7.execute-api.eu-central-1.amazonaws.com/default/instagram-gateway?action=short_lived_token",
    {
      body: JSON.stringify({ code }, null, 2),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  )
    .then((res) => {
      console.log(res);
      return res;
    })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((reason) => console.error(reason));
}
