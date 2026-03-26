async function showCommitsLoading() {
    var contentView = document.getElementsByClassName("clearfix")[0];
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