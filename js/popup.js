var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);

document.getElementById("demoImage").onclick = function() {
    ext.tabs.create({url: "https://github.com/NirmalScaria/le-git-graph"});
}