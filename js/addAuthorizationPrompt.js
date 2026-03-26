var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);
var authMessageListener = null;
var authTimeoutId = null;
var authPopupWatchId = null;
var authFlowCompleted = false;

async function changeAuthorizationStatus(status, customDescription) {
    var authorizationTItle = document.getElementById("authorizationTitle");
    var authorizationDescription = document.getElementById("authorizationDescription");
    var authorizationButton = document.getElementById("authorizationStatusButton");
    var authorizationDropdownButton = document.getElementById('authorizationButton');
    if (status == "WAITING") {
        authorizationDropdownButton.style.display = 'none';
        authorizationButton.style.display = 'inline-block';
        authorizationTItle.textContent = "Waiting for authorization";
        authorizationDescription.textContent = customDescription || "Please complete the authorization process in the popup window.";
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
        authorizationDescription.textContent = customDescription || "Please try again.";
        authorizationButton.textContent = 'Try Again';
        authorizationButton.classList.add('btn-primary');
        authorizationButton.addEventListener("click", openAuthorization);
    }
}

function clearAuthTimers() {
    if (authTimeoutId) {
        clearTimeout(authTimeoutId);
        authTimeoutId = null;
    }
    if (authPopupWatchId) {
        clearInterval(authPopupWatchId);
        authPopupWatchId = null;
    }
}

function failAuth(reason) {
    authFlowCompleted = true;
    clearAuthTimers();
    changeAuthorizationStatus("FAIL", reason);
}

function completeAuthSuccess() {
    authFlowCompleted = true;
    clearAuthTimers();
}

function reloadThisPage() {
    window.location.reload();
}

function openAuthorization() {
    var authorizationButton = document.getElementById("authorizationType");
    var authorization_url = "https://github.com/login/oauth/authorize";
    var client_id = "Ov23liymsYDPFUWZiGVs";
    var scope = "public_repo";
    if (authorizationButton.value == "privateAndPublic") {
        scope = "repo"
    }
    var url = authorization_url + "?client_id=" + client_id + "&scope=" + scope;
    authFlowCompleted = false;
    clearAuthTimers();
    changeAuthorizationStatus("WAITING");
    ext.runtime.sendMessage({ action: "startListening" });

    if (authMessageListener) {
        ext.runtime.onMessage.removeListener(authMessageListener);
    }

    authMessageListener = function (request, sender, sendResponse) {
        if (request.status == "CALLBACK_LOADED") {
            changeAuthorizationStatus("WAITING", "Callback page reached. Finalizing authorization...");
            return;
        }

        if (request.status == "CALLBACK_DATA") {
            var meta = request.meta || {};
            var keys = meta.keys || [];
            var keyText = keys.length > 0 ? keys.join(", ") : "none";
            var tokenState = meta.hasToken ? "present" : "missing";
            var callbackInfo = "Callback seen at " + (meta.host || "unknown-host") + (meta.path || "") + ". Params: " + keyText + ". Token: " + tokenState + ".";
            changeAuthorizationStatus("WAITING", callbackInfo);
            return;
        }

        if (request.status == "SUCCESS" || request.status == "FAIL") {
            if (request.status == "SUCCESS") {
                completeAuthSuccess();
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
                var failReason = request.value && request.value.reason ? request.value.reason : "";
                if (failReason == "CODE_WITHOUT_TOKEN") {
                    failAuth("OAuth callback returned code only (no token). Hosted callback exchange is failing. Use Custom PAT for now.");
                }
                else {
                    failAuth("Authorization failed on callback. Please retry.");
                }
            }
        }
    };

    ext.runtime.onMessage.addListener(authMessageListener);

    authTimeoutId = setTimeout(function () {
        if (!authFlowCompleted) {
            failAuth("Timed out waiting for callback. If popup closed, reopen and try again.");
        }
    }, 120000);

    var popupWindow = window.open(url, "oauth2_popup", "width=800,height=600");
    if (!popupWindow) {
        failAuth("Popup blocked by browser. Allow popups for github.com and try again.");
        return;
    }

    authPopupWatchId = setInterval(function () {
        if (!authFlowCompleted && popupWindow.closed) {
            failAuth("Authorization popup was closed before completion.");
        }
    }, 500);
}

async function addAuthorizationPrompt(reason) {
    var contentView = getOrCreateContentView();
    if (!contentView) {
        return;
    }
    await new Promise(function (resolve) {
        ext.runtime.sendMessage({ action: 'fetchHtml', path: 'html/authorizationPrompt.html' }, function (branchSelectionHtmlText) {
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
