async function loadBranchesButton() {
    var contentView = document.getElementsByClassName("clearfix")[0];
    await new Promise(function (resolve) {
        chrome.runtime.sendMessage({ action: 'fetchHtml', path: 'html/branchSelection.html' }, function (branchSelectionHtmlText) {
            var newContent = null;
            if (branchSelectionHtmlText) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(branchSelectionHtmlText, 'text/html');
                newContent = doc.body.firstChild;
            }
            while (contentView.firstChild) {
                contentView.removeChild(contentView.firstChild);
            }
            if (newContent) {
                contentView.appendChild(newContent);
            }
            var token = getLocalToken();
            var userName = getLocalUserName();
            var url = "https://us-central1-github-tree-graph.cloudfunctions.net/prompt?userName=" + userName;
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    var resp = JSON.parse(xhr.responseText);
                    var showPrompt = resp.showPrompt;
                    console.log("showPrompt: " + showPrompt);
                    if (showPrompt) {
                        document.getElementById("promptImage").style.display = "inline-block";
                        document.getElementById("promptImage").addEventListener("click", function () {
                            window.open("https://scaria.dev/redirection.html", "_blank");
                        });
                    }
                }
            }
            xhr.send();
            resolve();
        });
    });
    return;
}