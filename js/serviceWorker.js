try {
    var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);
    var OAUTH_SOURCE_TAB_KEY = "oauthSourceTabId";
    var freTab;

    function getStorageArea() {
        if (ext && ext.storage && ext.storage.local) {
            return ext.storage.local;
        }
        return null;
    }

    function getStoredValue(key, callback) {
        var storageArea = getStorageArea();
        if (storageArea && typeof storageArea.get === "function") {
            storageArea.get([key], function (result) {
                callback(result ? result[key] : null);
            });
            return;
        }

        // Fallback for environments where extension storage APIs are unavailable.
        callback(localStorage.getItem(key));
    }

    function setStoredValue(key, value) {
        var storageArea = getStorageArea();
        if (storageArea && typeof storageArea.set === "function") {
            storageArea.set({ [key]: value });
            return;
        }

        localStorage.setItem(key, value);
    }

    function removeStoredValue(key) {
        var storageArea = getStorageArea();
        if (storageArea && typeof storageArea.remove === "function") {
            storageArea.remove(key);
            return;
        }

        localStorage.removeItem(key);
    }

    function sendAuthResult(status, payload) {
        getStoredValue(OAUTH_SOURCE_TAB_KEY, function (targetTabId) {
            if (typeof targetTabId === "string") {
                targetTabId = parseInt(targetTabId, 10);
            }
            if (!targetTabId) {
                return;
            }

            var message = { status: status };
            if (status == "SUCCESS") {
                message.value = payload;
            }

            ext.tabs.sendMessage(targetTabId, message, function () {
                // Ignore runtime errors here (tab might have been closed/navigated).
                if (ext && ext.runtime) {
                    void ext.runtime.lastError;
                }
            });

            removeStoredValue(OAUTH_SOURCE_TAB_KEY);
        });
    }

    function notifyAuthProgress(status) {
        getStoredValue(OAUTH_SOURCE_TAB_KEY, function (targetTabId) {
            if (typeof targetTabId === "string") {
                targetTabId = parseInt(targetTabId, 10);
            }
            if (!targetTabId) {
                return;
            }
            ext.tabs.sendMessage(targetTabId, { status: status }, function () {
                if (ext && ext.runtime) {
                    void ext.runtime.lastError;
                }
            });
        });
    }

    ext.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action == "startListening") {
            if (sender && sender.tab && sender.tab.id) {
                setStoredValue(OAUTH_SOURCE_TAB_KEY, sender.tab.id);
            }
        }
        else if (request.action == "authDone") {
            if (request.status != "SUCCESS") {
                sendAuthResult("FAIL");
            }
            else {
                const githubToken = request.token;
                const userName = request.userName;
                sendAuthResult("SUCCESS", { token: githubToken, userName: userName });
            }
        }
        else if (request.action == "authCallbackLoaded") {
            notifyAuthProgress("CALLBACK_LOADED");
        }
        else if (request.action == "freDone") {
            ext.tabs.remove(freTab.id);
        }
        else if (request.action == "fetchHtml") {
            fetch(ext.runtime.getURL(request.path))
                .then(function (response) {
                    return response.text();
                })
                .then(function (htmlText) {
                    sendResponse(htmlText);
                })
                .catch(function () {
                    sendResponse("");
                });
            return true;
        }
    });
    ext.runtime.onInstalled.addListener(async function (details) {
        if (details.reason == "install") {
            freTab = await ext.tabs.create({ url: "https://www.github.com/NirmalScaria/le-git-graph/?fre=true&reason=" + details.reason });
        }
        else if (details.reason == "update") {
        }
    });
}
catch (e) {
    console.log(e);
}