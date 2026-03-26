function authorizationSuccessCallBack(token, userName) {
    console.log("Extension got the token");
    console.log(token);
    function dispatchSafe(payload) {
        var safePayload = JSON.stringify(payload);
        var event = new CustomEvent("PassToBackground", { detail: safePayload });
        window.dispatchEvent(event);
    }

    if (token == "FAIL") {
        dispatchSafe({ action: "authDone", status: "FAIL" });
    }
    else {
        dispatchSafe({ action: "authDone", status: "SUCCESS", token: token, userName: userName });
    }
}