// Set systemState
let systemState = {
  interval: 10 // seconds
}

chrome.storage.local.get('systemState', function(result){
  let isEmpty = Object.keys(result).length === 0;
  if (isEmpty){
    chrome.storage.local.set({'systemState': systemState})
  }else{
    systemState.interval = result.systemState.interval
  }
})

chrome.storage.local.set({'systemState': systemState})

async function getTab() {
  let queryOptions = { url:"https://*.zendesk.com/agent/filters/*" };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  console.log(tab)
  return tab;
}

// Function that runs on ZenDesk Page
function injectScript(interval){

  // Clear interval if one already exists
  if(typeof zendesk_refresh != 'undefined'){
    clearInterval(zendesk_refresh)
  }

  // Set interval to click button
  zendesk_refresh = setInterval(function(){
    let refresh = document.querySelectorAll("[data-test-id='views_views-list_header-refresh']")[0];
    refresh.click()
  }, interval * 1000);
}

chrome.history.onVisited.addListener((visited_site) => {
  let tab = getTab()
  tab.then(function (tab) {

    // Change visited_site to just the URL data
    visited_site = new URL(visited_site.url)

    // Get full URL for string comparison
    visited_url = visited_site.host + visited_site.pathname

    // Only run this script for urls containing .zendesk.com/agent
    if (visited_url.indexOf('.zendesk.com/agent/filters') != -1) {
      chrome.scripting.executeScript(
        {
          target: { 'tabId': tab.id, allFrames: true },
          func: injectScript,
          args: [systemState.interval]
        });
    }

  })
})

chrome.runtime.onMessage.addListener(
  async function(request, sender, sendResponse){

    // If save button was pressed in popup
    if(request.action == 'update'){
      systemState.interval = request.interval
      chrome.storage.local.set({'systemState': systemState})
      console.log('Updated interval to: ' + request.interval + " seconds")

      // Re-inject script in tab
      let tab = getTab()
      tab.then(function (tab) {
        chrome.scripting.executeScript(
          {
            target: { 'tabId': tab.id, allFrames: true },
            func: injectScript,
            args: [systemState.interval]
          });
      })
    }

    // If popup was opened
    if(request.action == 'getInterval'){
      sendResponse(systemState.interval)
    }
  })