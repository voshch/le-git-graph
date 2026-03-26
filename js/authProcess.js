var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);

// This will be injected to the authorization callback page.
// authInject.js will be added as content script to the page.
// It will call a window dispatchevent, which will be catched in this file
// and sent to the extension as a chrome.runtime.sendMessage.

// This is necessary due to the restrictions on what is accessible
// to the content scripts (they cannot access chrome. variables)
// and what is accessible to the background script (they cannot access
// the page variables. (token is needed))

function injectScript(file_path, tag) {
    var node = document.getElementsByTagName(tag)[0];
    if (!node) {
        return;
    }
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}

var authMessageSent = false;

function sendAuthDone(payload) {
    if (authMessageSent || !ext || !ext.runtime) {
        return;
    }
    authMessageSent = true;
    ext.runtime.sendMessage(payload);
}

if (ext && ext.runtime) {
    ext.runtime.sendMessage({ action: "authCallbackLoaded" });
}

function getFirstDefined(params, keys) {
    for (var i = 0; i < keys.length; i++) {
        var value = params.get(keys[i]);
        if (value) {
            return value;
        }
    }
    return null;
}

function buildCombinedParams() {
    var params = new URLSearchParams(window.location.search || "");
    var hash = window.location.hash || "";
    if (hash.length > 1) {
        var hashParams = new URLSearchParams(hash.substring(1));
        hashParams.forEach(function (value, key) {
            if (!params.has(key)) {
                params.set(key, value);
            }
        });
    }
    return params;
}

function handleAuthFromUrl() {
    var params = buildCombinedParams();
    var error = getFirstDefined(params, ["error", "error_description", "status"]);
    if (error && error.toLowerCase() != "success") {
        sendAuthDone({ action: "authDone", status: "FAIL" });
        return true;
    }

    var token = getFirstDefined(params, ["access_token", "token", "githubToken", "github_token", "oauth_token"]);
    if (!token || token == "FAIL") {
        return false;
    }

    var userName = getFirstDefined(params, ["userName", "username", "user", "login"]) || "";
    sendAuthDone({ action: "authDone", status: "SUCCESS", token: token, userName: userName });
    return true;
}

var handledFromUrl = handleAuthFromUrl();
if (!handledFromUrl) {
    injectScript(ext.runtime.getURL('js/authInject.js'), 'body');
}

window.addEventListener("PassToBackground", function (evt) {
    sendAuthDone(evt.detail);
}, false);