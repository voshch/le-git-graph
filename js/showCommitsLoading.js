function getRepoContentHost() {
    return document.querySelector(".application-main #repo-content-pjax-container, .application-main #js-repo-pjax-container, .application-main");
}

function removeNativeRepoContent() {
    var contentView = document.getElementById("le-git-graph-root");
    var contentHost = contentView && contentView.parentElement ? contentView.parentElement : getRepoContentHost();
    if (!contentHost) {
        return;
    }

    Array.from(contentHost.children).forEach(function (child) {
        if (contentView && child === contentView) {
            return;
        }
        child.remove();
    });
}

function getOrCreateContentView() {
    var contentView = document.getElementById("le-git-graph-root");
    if (contentView) {
        return contentView;
    }

    var parent = getRepoContentHost();
    if (!parent) {
        parent = document.querySelector("main") || document.body;
    }
    if (!parent) {
        return null;
    }

    contentView = document.createElement("div");
    contentView.id = "le-git-graph-root";
    contentView.className = "le-git-graph-root";

    // Insert at the top of repo content so the extension view appears where users expect tab content.
    if (parent.firstElementChild) {
        parent.insertBefore(contentView, parent.firstElementChild);
    } else {
        parent.appendChild(contentView);
    }
    return contentView;
}

async function showCommitsLoading() {
    var contentView = getOrCreateContentView();
    if (!contentView) {
        return;
    }

    removeNativeRepoContent();

    await new Promise(function (resolve) {
        chrome.runtime.sendMessage({ action: 'fetchHtml', path: 'html/commitsLoading.html' }, function (commitsLoadingHtmlText) {
            var newContent = null;
            if (commitsLoadingHtmlText) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(commitsLoadingHtmlText, 'text/html');
                newContent = doc.body.firstChild;
            }
            while (contentView.firstChild) {
                contentView.removeChild(contentView.firstChild);
            }
            if (newContent) {
                contentView.appendChild(newContent);
            }
            resolve();
        });
    });
    return;
}