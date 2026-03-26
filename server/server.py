import os
from urllib.parse import urlencode

import requests
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse

app = FastAPI(title="Le Git Graph OAuth Server")

GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.get("/github-tree-graph/authorize", response_class=HTMLResponse)
def github_authorize_callback(request: Request):
    client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()

    version = request.query_params.get("version", "2")
    error = request.query_params.get("error")
    code = request.query_params.get("code")
    token = request.query_params.get("access_token")

    if error:
        return _render_text_page("GitHub authorization failed. You can close this window.")

    # If token is already present in URL, this is the terminal step used by the extension content script.
    if token:
        return _render_text_page("Authorization complete. You can close this window.")

    if not code:
        return _render_text_page("Missing OAuth code. Please retry authorization.")

    if not client_id or not client_secret:
        return _render_text_page("Server is missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET.")

    redirect_uri = f"https://{request.url.hostname}/github-tree-graph/authorize?version={version}"

    token_response = requests.post(
        GITHUB_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=15,
    )

    if token_response.status_code != 200:
        return _render_text_page("Token exchange failed. Please retry.")

    token_json = token_response.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return _render_text_page("Token exchange did not return an access token.")

    user_name = ""
    user_response = requests.get(
        GITHUB_USER_URL,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15,
    )
    if user_response.status_code == 200:
        user_json = user_response.json()
        user_name = user_json.get("login", "")

    # Redirect with token + username in query params so extension content script can pick them up.
    final_query = urlencode(
        {
            "version": version,
            "access_token": access_token,
            "userName": user_name,
        }
    )
    return RedirectResponse(url=f"/github-tree-graph/authorize?{final_query}", status_code=302)


def _render_text_page(message: str):
        return HTMLResponse(content=f"""<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Le Git Graph Auth</title>
    <style>
      body {{
        font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
        max-width: 700px;
        margin: 48px auto;
        padding: 0 16px;
        color: #111827;
      }}
      .card {{
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 20px;
        background: #ffffff;
      }}
    </style>
  </head>
  <body>
    <div class=\"card\">{message}</div>
  </body>
</html>""")


def main():
    port = int(os.getenv("PORT", "80"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
