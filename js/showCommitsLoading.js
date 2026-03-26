async function showCommitsLoading() {
    var contentView = document.getElementsByClassName("clearfix")[0];
    await new Promise(function (resolve) {
        chrome.runtime.sendMessage({ action: 'fetchHtml', path: 'html/commitsLoading.html' }, function (commitsLoadingHtmlText) {
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = commitsLoadingHtmlText || "";
            var newContent = tempDiv.firstChild;
            contentView.innerHTML = "";
            if (newContent) {
                contentView.appendChild(newContent);
            }
            resolve();
        });
    });
    return;
}