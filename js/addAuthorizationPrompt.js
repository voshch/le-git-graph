async function changeAuthorizationStatus(status) {
    var authorizationTItle = document.getElementById("authorizationTitle");
    var authorizationDescription = document.getElementById("authorizationDescription");
    var authorizationButton = document.getElementById("authorizationStatusButton");
    var authorizationDropdownButton = document.getElementById('authorizationButton');
    if (status == "WAITING") {
        authorizationDropdownButton.style.display = 'none';
        authorizationButton.style.display = 'inline-block';
        authorizationTItle.textContent = "Waiting for authorization";
        authorizationDescription.textContent = "Please complete the authorization process in the popup window.";
        authorizationButton.textContent = 'Waiting...';
        authorizationButton.classList.remove('btn-primary');
        authorizationButton.removeEventListener("click", openAuthorization);
    }
    if (status == "SUCCESS") {
        authorizationTItle.textContent = "Authorization successful";
        authorizationDescription.textContent = "Reload this page to see the commits.";
        authorizationButton.textContent = 'Reload Now';
        authorizationButton.classList.add('btn-primary');
        authorizationButton.addEventListener("click", reloadThisPage);
    }
    if (status == "FAIL") {
        authorizationButton.style.display = 'none';
        authorizationDropdownButton.style.display = 'inline-block';
        authorizationTItle.textContent = "Authorization failed";
        authorizationDescription.textContent = "Please try again.";
        authorizationButton.textContent = 'Try Again';
        authorizationButton.classList.add('btn-primary');
        authorizationButton.addEventListener("click", openAuthorization);
    }
}

function reloadThisPage() {
    window.location.reload();
}

function openAuthorization() {
    var authorizationButton = document.getElementById("authorizationType");
    var authorization_url = "https://github.com/login/oauth/authorize";
    var client_id = "91ddd618eba025e4104e";
    var redirect_url = "https://scaria.dev/github-tree-graph/authorize?version=2";
    var scope = "public_repo";
    if (authorizationButton.value == "privateAndPublic") {
        scope = "repo"
    }
    var url = authorization_url + "?client_id=" + client_id + "&redirect_uri=" + redirect_url + "&scope=" + scope;
    changeAuthorizationStatus("WAITING");
    chrome.runtime.sendMessage({ action: "startListening" });
    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.status == "SUCCESS" || request.status == "FAIL") {
                if (request.status == "SUCCESS") {
                    var githubToken = request.value.token;
                    var userName = request.value.userName;
                    storeLocalToken(githubToken);
                    storeLocalUserName(userName);
                    var url = window.location.href;
                    var paramsObj = {};
                    if (url.indexOf("?") > -1) {
                        var params = url.split("?")[1].split("&");
                        for (var i = 0; i < params.length; i++) {
                            var param = params[i].split("=");
                            paramsObj[param[0]] = param[1];
                        }
                    }
                    if (paramsObj['fre'] == "true") {
                        window.location.href = url + "&resume=true";
                    }
                    else {
                        changeAuthorizationStatus("SUCCESS");
                    }
                }
                else {
                    changeAuthorizationStatus("FAIL");
                }
            }
        }
    );
    window.open(url, "oauth2_popup", "width=800,height=600");
}

async function addAuthorizationPrompt(reason) {
    var contentView = getOrCreateContentView();
    if (!contentView) {
        return;
    }
    await new Promise(function (resolve) {
        chrome.runtime.sendMessage({ action: 'fetchHtml', path: 'html/authorizationPrompt.html' }, function (branchSelectionHtmlText) {
            var newContent = null;
            if (branchSelectionHtmlText) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(branchSelectionHtmlText, 'text/html');
                newContent = doc.body.firstChild;
            }
            while (contentView.firstChild) {
                contentView.removeChild(contentView.firstChild);
            }
            if (!newContent) {
                resolve();
                return;
            }
            var authorizationButton = newContent.getElementsByClassName("authorizeButton")[0];
            var authorizationReason = newContent.getElementsByClassName("authorizationReason")[0];
            var authorizationTypeButton = newContent.getElementsByClassName("authorizationType")[0];
            authorizationButton.addEventListener("click", proceedForAuthorization);
            var privateAndPublicButton = newContent.getElementsByClassName("private-and-public-button")[0];
            var customPATButton = newContent.getElementsByClassName("custom-pat-button")[0];
            var publicOnlyButton = newContent.getElementsByClassName("public-only-button")[0];
            var customPATInput = document.getElementsByClassName("custom-pat-input")[0];
            privateAndPublicButton.addEventListener("click", function (e) {
                authorizationTypeButton.value = "privateAndPublic";
                authorizationButton.disabled = false;
                authorizationButton.style.cursor = "pointer";
                authorizationButton.value = "Authorize with Le Git Graph";
                    authorizationButton.textContent = "Authorize with Le Git Graph";
                customPATInput.style.display = "none";
            });
            publicOnlyButton.addEventListener("click", function (e) {
                authorizationTypeButton.value = "publicOnly";
                authorizationButton.disabled = false;
                authorizationButton.style.cursor = "pointer";
                authorizationButton.value = "Authorize with Le Git Graph";
                authorizationButton.textContent = "Authorize with Le Git Graph";
                customPATInput.style.display = "none";
            });
            customPATButton.addEventListener("click", function (e) {
                authorizationTypeButton.value = "customPAT";
                customPATInput.style.display = "block";
                authorizationButton.value = "Set PAT";
                authorizationButton.textContent = "Set PAT";
                if (customPATInput.value.length > 0) {
                    authorizationButton.disabled = false;
                    authorizationButton.style.cursor = "pointer";
                }
                else {
                    authorizationButton.disabled = true;
                    authorizationButton.style.cursor = "not-allowed";
                }
            });
            authorizationReason.textContent = reason;
            contentView.appendChild(newContent);
            var customPATInput = document.getElementsByClassName("custom-pat-input")[0];
            customPATInput.addEventListener("input", function (e) {
                if (customPATInput.value.length > 0) {
                    authorizationButton.disabled = false;
                    authorizationButton.style.cursor = "pointer";
                }
            });
            resolve();
        });
    });
    return;
}
function proceedForAuthorization() {
    var authorizationTypeButton = document.getElementsByClassName("authorizationType")[0];
    var authorizationType = authorizationTypeButton.value;
    if (authorizationType == "customPAT") {
        var customPATInput = document.getElementsByClassName("custom-pat-input")[0];
        var customPAT = customPATInput.value;
        storeLocalToken(customPAT);
        storeLocalUserName("");
        var presentUrl = window.location.href;
        if (presentUrl.indexOf("?") < 0) {
            window.location.href = presentUrl + "/?page=commits";
        }
        else {
            window.location.reload();
        }
    }
    else {
        openAuthorization();
    }
}
