try {
    var githubTab;
    var freTab;
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action == "startListening") {
            githubTab = sender.tab;
        }
        else if (request.action == "authDone") {
            if (request.status != "SUCCESS") {
                chrome.tabs.sendMessage(githubTab.id, { status: "FAIL" });
            }
            else {
                const githubToken = request.token;
                const userName = request.userName;
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    chrome.tabs.sendMessage(githubTab.id, { status: "SUCCESS", value: { token: githubToken, userName: userName } });
                });
            }
        }
        else if (request.action == "freDone") {
            chrome.tabs.remove(freTab.id);
        }
        else if (request.action == "fetchHtml") {
            fetch(chrome.runtime.getURL(request.path))
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
    chrome.runtime.onInstalled.addListener(async function (details) {
        if (details.reason == "install") {
            freTab = await chrome.tabs.create({ url: "https://www.github.com/NirmalScaria/le-git-graph/?fre=true&reason=" + details.reason });
        }
        else if (details.reason == "update") {
        }
    });
}
catch (e) {
    console.log(e);
}