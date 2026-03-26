var maxX = 100;
var ext = typeof globalThis["chrome"] !== "undefined" ? globalThis["chrome"] : (typeof browser !== "undefined" ? browser : null);

async function drawCurve(container, startx, starty, endx, endy, color) {
  var firstLineEndY = starty + ((endy - starty - 40) / 2);
  var secondLineStartY = firstLineEndY + 40;
  var svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svgElement.setAttribute('d', 'M ' + startx + ' ' + starty + ' L ' + startx + ' ' + firstLineEndY + ' C ' + startx + ' ' + (parseInt(firstLineEndY) + 20) + ' , ' + endx + ' ' + (parseInt(firstLineEndY) + 20) + ' , ' + endx + ' ' + (parseInt(firstLineEndY) + 40) + ' L ' + endx + ' ' + endy);
  svgElement.setAttribute('stroke', color);
  svgElement.setAttribute('stroke-width', '1');
  svgElement.setAttribute('fill', '#00000000');
  container.appendChild(svgElement);
}

async function drawDottedLine(container, startx, starty, color) {
  var solidLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  solidLine.setAttribute('d', 'M ' + startx + ' ' + starty + ' L ' + startx + ' ' + (starty + 10));
  solidLine.setAttribute('stroke', color);
  solidLine.setAttribute('stroke-width', '1');
  solidLine.setAttribute('fill', '#00000000');
  container.appendChild(solidLine);
  var dashedLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  dashedLine.setAttribute('d', 'M ' + startx + ' ' + (starty + 10) + ' L ' + startx + ' ' + (starty + 30));
  dashedLine.setAttribute('stroke', color);
  dashedLine.setAttribute('stroke-width', '1');
  dashedLine.setAttribute('stroke-dasharray', '2,2');
  dashedLine.setAttribute('fill', '#00000000');
  container.appendChild(dashedLine);
}

var hoveredCommitSha = "";

async function showCard(commitId, commitDot) {
  hoveredCommitSha = commitId;
  var hoverCardParent;
  await new Promise(function (resolve) {
    ext.runtime.sendMessage({ action: 'fetchHtml', path: 'html/hoverCard.html' }, function (hoverCardHtmlText) {
      if (hoverCardHtmlText) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(hoverCardHtmlText, 'text/html');
        hoverCardParent = doc.body;
      } else {
        hoverCardParent = document.createElement('div');
      }
      resolve();
    });
  });
  var commitDotX = getOffset(commitDot).x + 20;
  var commitDotY = getOffset(commitDot).y - 25;
  var hoverCard = hoverCardParent.firstChild;
  hoverCard.style.left = commitDotX + "px";
  hoverCard.style.top = commitDotY + "px";
  addCardContent(commitId, commitDot, hoverCardParent);
}

async function addCardContent(commitId, commitDot, hoverCardParent) {
  var colorDict = {};
  var legendContainer = document.getElementById("legendContainer");
  for (var i = 0; i < legendContainer.children.length; i++) {
    var branchName = legendContainer.children[i].getAttribute("branchName");
    var branchColor = legendContainer.children[i].getAttribute("branchColor");
    colorDict[branchName] = branchColor;
  }
  var commit = commitDictGlobal[commitId];
  var commitDate = commit.committedDate;
  var parents = []
  for (var i = 0; i < commit.parents.length; i++) {
    parents.push(commit.parents[i].node.oid.substring(0, 7));
  }
  var commitDateFormatted = new Date(commitDate).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  var commitTimeFormatted = new Date(commitDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
  var commitDateAndTimeFormatted = "Committed on " + commitDateFormatted + " at " + commitTimeFormatted;
  hoverCardParent.querySelector("#commit-time-message").textContent = commitDateAndTimeFormatted;
  var legendContainer = document.getElementById("legendContainer");
  var headsOf = [];
  for (var i = 0; i < legendContainer.children.length; i++) {
    var thisBranch = legendContainer.children[i];
    if (thisBranch.getAttribute("commitId") == commitId) {
      headsOf.push([thisBranch.getAttribute("branchname"), thisBranch.getAttribute("branchColor")]);
    }
  }
  var headIndicationSection = hoverCardParent.querySelector("#head-indication-section");
  if (headsOf.length < 1) {
    headIndicationSection.style.display = "none";
  }
  else {
    var headIndicationContent = headIndicationSection.querySelector("#head-indication-content");
    var headIndicationItem = headIndicationContent.children[0].cloneNode(true);
    headIndicationContent.textContent = "Head of ";
    for (var i = 0; i < headsOf.length; i++) {
      var thisHeadIndicationItem = headIndicationItem.cloneNode(true);
      var branchIcon = thisHeadIndicationItem.querySelector(".branch-icon-svg");
      branchIcon.style.fill = headsOf[i][1];
      thisHeadIndicationItem.appendChild(document.createTextNode(headsOf[i][0]));
      headIndicationContent.appendChild(thisHeadIndicationItem);
    }
  }
  var parentIndicationContent = hoverCardParent.querySelector("#parent-indication-content");
  var parentIndicationItem = parentIndicationContent.children[0].cloneNode(true);
  parentIndicationContent.textContent = parents.length < 2 ? "Parent: " : "Parents: ";
  for (var i = 0; i < parents.length; i++) {
    var thisParentIndicationItem = parentIndicationItem.cloneNode(true);
    thisParentIndicationItem.appendChild(document.createTextNode(parents[i]));
    parentIndicationContent.appendChild(thisParentIndicationItem);
  }
  var branchesIndicationContent = hoverCardParent.querySelector("#branches-indication-content");
  var branchesIndicationItem = branchesIndicationContent.children[0].cloneNode(true);
  while (branchesIndicationContent.firstChild) {
    branchesIndicationContent.removeChild(branchesIndicationContent.firstChild);
  }
  for (var i = 0; i < commit.branches.length; i++) {
    var thisBranchIndicationItem = branchesIndicationItem.cloneNode(true);
    var branchIcon = thisBranchIndicationItem.querySelector(".branch-icon-svg");
    branchIcon.style.fill = colorDict[commit.branches[i]];
    thisBranchIndicationItem.appendChild(document.createTextNode(commit.branches[i]));
    branchesIndicationContent.appendChild(thisBranchIndicationItem);
  }
  var additionCountWrapper = hoverCardParent.querySelector("#addition-count");
  var deletionCountWrapper = hoverCardParent.querySelector("#deletion-count");
  additionCountWrapper.textContent = commit.additions;
  deletionCountWrapper.textContent = commit.deletions;
  var hoverCardContainer = document.getElementById("hoverCardContainer");
  while (hoverCardContainer.firstChild) {
    hoverCardContainer.removeChild(hoverCardContainer.firstChild);
  }
  hoverCardContainer.appendChild(hoverCardParent.firstChild.cloneNode(true));
  hoverCardContainer.children[0].style.display = 'block';
}

async function hideCard() {
  var hoverCardContainer = document.getElementById("hoverCardContainer");
  hoverCardContainer.children[0].children[0].classList.remove("Popover-message--left-top");
  hoverCardContainer.children[0].style.display = 'none';
}

function drawCommit(commit) {
  var fragment = document.createDocumentFragment();
  var cx = commit.cx;
  var cy = commit.cy;
  if (commit.isHead) {
    var commentHeadCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    commentHeadCircle.setAttribute('class', 'commitHeadDot');
    commentHeadCircle.setAttribute('cx', cx);
    commentHeadCircle.setAttribute('cy', cy);
    commentHeadCircle.setAttribute('r', '7');
    commentHeadCircle.setAttribute('stroke', commit.color);
    commentHeadCircle.setAttribute('fill', '#00000000');
    commentHeadCircle.setAttribute('circlesha', commit.oid);
    fragment.appendChild(commentHeadCircle);
  }
  var commitDotCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  commitDotCircle.setAttribute('class', 'commitDot');
  commitDotCircle.setAttribute('cx', cx);
  commitDotCircle.setAttribute('cy', cy);
  commitDotCircle.setAttribute('r', '4');
  commitDotCircle.setAttribute('fill', commit.color);
  commitDotCircle.setAttribute('circlesha', commit.oid);
  fragment.appendChild(commitDotCircle);
  
  var commitDotHiddenCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  commitDotHiddenCircle.setAttribute('class', 'commitDotHidden');
  commitDotHiddenCircle.setAttribute('cx', cx);
  commitDotHiddenCircle.setAttribute('cy', cy);
  commitDotHiddenCircle.setAttribute('r', '19');
  commitDotHiddenCircle.setAttribute('fill', '#ffffff00');
  commitDotHiddenCircle.setAttribute('circlesha', commit.oid);
  fragment.appendChild(commitDotHiddenCircle);
  
  return fragment;
}

function onHoveringCommit(e) {
  var hoveredsha = e.target.attributes.circlesha.value;
  hoverOnCommit(hoveredsha);
}

async function hoverOnCommit(hoveredsha) {
  var commitDot = document.querySelectorAll('[circlesha="' + hoveredsha + '"][class="commitDot"]')[0];
  if (commitDot == undefined) {
    return;
  }
  await showCard(hoveredsha, commitDot);
  commitDot.classList.add("commitDotHovered");
  commitDot.classList.remove("commitDot");
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function onHoverRemove(e) {
  var hoveredsha = e.target.attributes.circlesha.value;
  var commitDot = document.querySelectorAll('[circlesha="' + hoveredsha + '"][class="commitDotHovered"]')[0];
  if (commitDot == undefined) {
    return;
  }
  await delay(100);
  if (!isHoverCardHovered()) {
    removeHoverFrom(commitDot);
  }
  else {
    var hoverCard = document.getElementById("hovercard");
    hoverCard.addEventListener("mouseleave", function () {
      removeHoverFrom(commitDot);
    }, false);
  }
}

async function removeHoverFrom(commitDot) {
  await delay(100);
  var thisHiddenDot = document.querySelectorAll('[circlesha="' + commitDot.attributes.circlesha.value + '"][class="commitDotHidden"]')[0];
  if (thisHiddenDot != undefined && thisHiddenDot.matches(":hover")) {
    return;
  }
  commitDot.classList.remove("commitDotHovered");
  commitDot.classList.add("commitDot");
  if (commitDot.attributes.circlesha.value == hoveredCommitSha) {
    hideCard();
  }
}

function isHoverCardHovered() {
  var hoverCard = document.getElementById("hovercard");
  return (hoverCard != undefined && hoverCard.matches(":hover"));
}


var commitDictGlobal;
async function drawGraph(commits, commitDict) {
  commitDictGlobal = commitDict;
  var commitsContainer = document.getElementById("commits-container");
  var commitsContainerHeight = commitsContainer.offsetHeight;

  var commitsGraphContainer = document.getElementById("graphSvg");

  while (commitsGraphContainer.firstChild) {
    commitsGraphContainer.removeChild(commitsGraphContainer.firstChild);
  }
  commitsGraphContainer.style.height = commitsContainerHeight + 'px';
  var yPos = 0;

  var indexArray = Array.from(Array(commits.length), () => new Array(0));
  var lineColors = Array.from('#000000', () => undefined);
  for (var commit of commits) {
    lineColors[commit.lineIndex] = commit.color;
  }
  for (var line = 0; line < commits.length; line++) {
    var lineBeginning = 100;
    var lineEnding = 0;
    for (var commitIndex = 0; commitIndex < commits.length; commitIndex++) {
      commit = commits[commitIndex];
      var foundLineInParents = false;
      for (parent of commit.parents) {
        var parentItem = commitDict[parent.node.oid];
        if (parentItem != undefined && parentItem.lineIndex == line) {
          foundLineInParents = true;
        }
      }
      if (commit.lineIndex == line || foundLineInParents) {
        lineBeginning = Math.min(lineBeginning, commitIndex);
        lineEnding = Math.max(lineEnding, commitIndex);
      }
    }
    for (var i = lineBeginning; i < lineEnding; i++) {
      indexArray[i + 1].push(line);
    }
  }

  for (var i = 0; i < commits.length; i++) {
    var commit = commits[i];
    var commitXIndex = indexArray[i].indexOf(commit.lineIndex);
    if (commitXIndex == -1) {
      commitXIndex = indexArray[i].length;
    }
    var thisCommitItem = document.querySelectorAll('[commitsha="' + commit.oid + '"]')[0];
    yPos += (thisCommitItem.offsetHeight - 1) / 2;
    commits[i].cx = 30 + (commitXIndex * 14);
    commits[i].cy = yPos;
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', 30 + (commitXIndex * 14));
    circle.setAttribute('cy', yPos);
    circle.setAttribute('r', '1');
    circle.setAttribute('fill', commit.color);
    circle.setAttribute('circlesha', commit.oid);
    commitsGraphContainer.appendChild(circle);
    yPos += thisCommitItem.offsetHeight / 2;
  }

  for (var i = 0; i < (commits.length - 1); i++) {
    var commit = commits[i];
    var hasVisibleParents = false;
    for (parentItem of commit.parents) {
      var parent = commitDict[parentItem.node.oid];
      var thisx = document.querySelectorAll('[circlesha="' + commit.oid + '"]')[0].cx.baseVal.value;
      var thisy = document.querySelectorAll('[circlesha="' + commit.oid + '"]')[0].cy.baseVal.value;
      if (parent != undefined) {
        hasVisibleParents = true;
        var nextx = 30 + (14 * (indexArray[i + 1].indexOf(parent.lineIndex)));
        var nexty = document.querySelectorAll('[circlesha="' + commits[i + 1].oid + '"]')[0].cy.baseVal.value;
        drawCurve(commitsGraphContainer, thisx, thisy, nextx, nexty, lineColors[parent.lineIndex]);
      }
    }
    if (!hasVisibleParents) {
      var thisx = document.querySelectorAll('[circlesha="' + commit.oid + '"]')[0].cx.baseVal.value;
      var thisy = document.querySelectorAll('[circlesha="' + commit.oid + '"]')[0].cy.baseVal.value;
      drawDottedLine(commitsGraphContainer, thisx, thisy, lineColors[commit.lineIndex]);
    }
  }
  for (var thisLineIndex = 0; thisLineIndex < commits.length; thisLineIndex++) {
    for (var i = 0; i < (commits.length - 1); i++) {
      var commit = commits[i];
      if (indexArray[i].includes(thisLineIndex) && indexArray[i + 1].includes(thisLineIndex)) {
        var thisx = 30 + (14 * (indexArray[i].indexOf(thisLineIndex)));
        var thisy = document.querySelectorAll('[circlesha="' + commit.oid + '"]')[0].cy.baseVal.value;
        var nextx = 30 + (14 * (indexArray[i + 1].indexOf(thisLineIndex)));
        var nexty = document.querySelectorAll('[circlesha="' + commits[i + 1].oid + '"]')[0].cy.baseVal.value;
        drawCurve(commitsGraphContainer, thisx, thisy, nextx, nexty, lineColors[thisLineIndex]);
        maxX = Math.max(thisx,maxX);
      }
    }
  }

  var yPos = 0;
  for (var commit of commits) {
    var commitFragment = drawCommit(commit);
    commitsGraphContainer.appendChild(commitFragment);
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (var commit of commits) {
        let commitDotHidden = document.querySelectorAll('[circlesha="' + commit.oid + '"][class="commitDotHidden"]')[0];
        commitDotHidden.addEventListener("mouseover", onHoveringCommit);
        commitDotHidden.addEventListener("mouseout", onHoverRemove);
      }
    });
  });
  if(maxX > 100){
    // Any more than that can hamper the UI of the screen
    maxX = Math.min(maxX,198)
    // Updating the width of the svgContainer Element
    var svgContainer = document.querySelector('#graphSvg');
    svgContainer.style.width = maxX;
  }
}

// Get the vertical and horizontal position (center)
// of any given element
function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.right) / 2 + window.scrollX,
    y: (rect.top + rect.bottom) / 2 + window.scrollY,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
    startx: rect.left + window.scrollX,
    starty: rect.top + window.scrollY,
  };
}