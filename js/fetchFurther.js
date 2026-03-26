var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);

async function fetchFurther(commits, allCommits, heads, pageNo, branchNames, allBranches) {
  var commitsOl = document.getElementById("commitsOl");
  ext.runtime.sendMessage({ action: 'fetchHtml', path: 'html/commitsLoading.html' }, function (loadingIconText) {
    var newContent = null;
    if (loadingIconText) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(loadingIconText, 'text/html');
      newContent = doc.body.firstChild;
    }
    if (newContent) {
      commitsOl.appendChild(newContent);
    }
  });

  var presentUrl = window.location.href;
  var repoOwner = presentUrl.split('/')[3];
  var repoName = presentUrl.split('/')[4];
  var queryBeginning = `
    query { 
        rateLimit {
            limit
            cost
            remaining
            resetAt
          }
        repository(owner:"`+ repoOwner + `", name: "` + repoName + `") {`;
  var queryContent = queryBeginning;
  if (commits.length < 10) {
    return (false);
  }
  var lastTenCommits = commits.slice(commits.length - 20, commits.length);
  for (var i = 0; i < lastTenCommits.length; i++) {
    queryContent += `
        commit`+ i + `: object(oid: "` + lastTenCommits[i].oid + `") {
            ... on Commit{
                
                history(first: 20) {
                    edges {
                        node {
                            ... on Commit {
                                oid
                                messageHeadlineHTML
                                committedDate
                            }  
                        }
                    }
                }
              }
            }`;
  }
  queryContent += ` } } `;
  var endpoint = "https://api.github.com/graphql";
  var headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + getLocalToken()
  };
  var body = {
    query: queryContent
  };
  var response = await fetch(endpoint, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  });
  if ((response.status != 200 && response.status != 201)) {
    console.log("--ERROR FETCHING GRAPHQL--");
    addAuthorizationPrompt("Failed to fetch commits. Make sure your GitHub account has access to the repository.");
    return (false);
  }
  var data = await response.json();
  console.log(data);
  if (data.error) {
    console.log("--ERROR FETCHING GRAPHQL--");
    addAuthorizationPrompt("Failed to fetch commits. Make sure your GitHub account has access to the repository.");
    return (false);
  }
  var newlyFetchedCommits = data.data.repository;
  for (var newCommitId in newlyFetchedCommits) {
    var newCommit = newlyFetchedCommits[newCommitId];
    var thisCommits = newCommit.history.edges;
    for (var thisCommit of thisCommits) {
      var commitNode = thisCommit.node;
      var safeCommit = JSON.parse(JSON.stringify(commitNode));
      safeCommit.committedDate = parseDate(safeCommit.committedDate);
      allCommits.push(safeCommit);
    }
  }

  var commitObject = {};

  for (var newCommit of allCommits) {
    if (commitObject[newCommit.oid] == undefined) {
      commitObject[newCommit.oid] = newCommit;
    }
    else {
      for (var parameter in newCommit) {
        commitObject[newCommit.oid][parameter] = newCommit[parameter];
      }
    }
  }

  allCommits = [];
  for (var commit in commitObject) {
    allCommits.push(commitObject[commit]);
  }

  allCommits.sort(function (a, b) {
    return b.committedDate - a.committedDate;
  });
  pageNo += 1;
  var commitsToShow = (allCommits.slice(0, 10 * pageNo));
  await showCommits(commitsToShow, branchNames, allCommits, heads, pageNo, allBranches);
  showLegend(heads);
}