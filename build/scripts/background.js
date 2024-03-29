var blockedCategories = [];
var userForcedRefresh = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.todo == "blockedCatArr") {
        console.log("categories:", request.categories);
        blockedCategories = request.categories;
        chrome.tabs.query({
                active: true,
                currentWindow: true
            },
            function(tabs) {
                // chrome.pageAction.show(tabs[0].id);
            }
        );
    } else if (request.userAction == "forcedRefresh") {
        getCatID(request.vidID);
        userForcedRefresh = true;
        response({ feedback: "redoing block" });
    }
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
    userForcedRefresh = false;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { todo: "getVidID" }, function(
            response
        ) {
            if (response != undefined) {
                console.log(response.vidID);
                getCatID(response.vidID);
            }
        });
    });

});

// retrieve category ID
function getCatID(vidID) {
    var fetchURL =
        "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" +
        vidID +
        "&key=AIzaSyAlWxetC3fiBRo64AXlbWsgBZ8ZRjHewhI";

    fetch(fetchURL, {
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.items["0"].snippet.categoryId); //success!
            var catID = data.items["0"].snippet.categoryId;
            var fetchCatURL =
                "https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&id=" +
                catID +
                "&key=AIzaSyAlWxetC3fiBRo64AXlbWsgBZ8ZRjHewhI";
            getCatName(fetchCatURL); // then retrieve category name
        })
        .catch(err => {
            console.log(err);
        });

    // retrieve category name
    function getCatName(fetchCatURL) {
        fetch(fetchCatURL, {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.items["0"].snippet.title);
                catName = data.items["0"].snippet.title;
                var toBlock = false;
                for (let i = 0; i < blockedCategories.length; i++) {
                    if (catName === blockedCategories[i]) {
                        toBlock = true;
                        break;
                    }
                }

                if (toBlock) {
                    console.log("block condition");
                    // sends message to all open tabs
                    // in case the user opens a to-be-blocked video in a new tab
                    chrome.tabs.query({}, function(tabs) {
                        var message = { todo: "blockVideo" };
                        for (var i = 0; i < tabs.length; ++i) {
                            chrome.tabs.sendMessage(tabs[i].id, message, function(response) {
                                if (response != undefined) {
                                    console.log(response.done);
                                }
                            });
                        }
                    });

                } else {

                    if (!userForcedRefresh) {
                        console.log("refreshing page to unblock wanted vid")
                        chrome.tabs.query({ active: true, currentWindow: true }, function(
                            tabs
                        ) {
                            chrome.tabs.sendMessage(
                                tabs[0].id, { todo: "refreshPageToUnblockVid" },
                                function(response) {
                                    if (response != undefined) {
                                        console.log(response.done);
                                    }
                                }
                            );
                        });
                    }
                }

            })
            .catch(err => {
                console.log(err);
            });
    }
}