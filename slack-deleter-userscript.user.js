// ==UserScript==
// @name         Slack deleter
// @version      1.0.0
// @description  Delete your messages on current "channel"
// @match https://slackGroupURL.slack.com/messages/*
// @author Joao Manuel Ferreira Fernandes
// @github		  http://github.com/etnepres/slack-deleter-userscript.git
// @grant none
// ==/UserScript==

let parts = window.location.href.split('/');
let channel = parts.pop() || parts.pop();

// CONFIGURATION #######################################################################################################

const token = 'YOUR-TOKEN-HERE'; // You can learn it from: https://api.slack.com/custom-integrations/legacy-tokens

// GLOBALS #############################################################################################################

const baseApiUrl    = 'https://slack.com/api/';
const messages      = [];
const historyApiUrl = baseApiUrl + 'conversations.history?token=' + token + '&count=1000&channel=' + channel + '&cursor=';
const deleteApiUrl  = baseApiUrl + 'chat.delete?token=' + token + '&channel=' + channel + '&ts='
let   delay         = 300; // Delay between delete operations in milliseconds
let   nextCursor    = '';


// Find userID with session vars

let userID = "";
let keys = Object.keys(Object.keys(localStorage).reduce(function(obj, str) {
    obj[str] = localStorage.getItem(str);
    return obj;
}, {}));

for(let i = 0; i < keys.length; i++){
    if(keys[i].indexOf("_active_history") > 0 ){
        userID = keys[i].replace("_active_history", "");
        break;
    }
}

// ---------------------------------------------------------------------------------------------------------------------

function deleteMessage() {

    if (messages.length == 0) {

        if (nextCursor) {
            processHistory();
            console.log("NEW PAGE");
        } else {
            console.log("ALL DELETED");
            alert("Finished");
            window.location = window.location;
        }

        return;
    }

    const ts = messages.shift();

    jQuery.ajax({
        url: deleteApiUrl + ts,
        type: 'GET',
        dataType: "json",
        success: function(response, textStatus, xhr){

            if (response.ok === true) {
                console.log(ts + ' deleted!');
                if(userID == ''){
                    userID
                }
            } else if (response.ok === false) {
                console.log(ts + ' could not be deleted! (' + response.error + ')');

                if (response.error === 'ratelimited') {
                    delay += 100; // If rate limited error caught then we need to increase delay.
                    console.log("Delay increased to:" + delay);
                    messages.push(ts);
                }
            }

            setTimeout(deleteMessage, delay);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            if (XMLHttpRequest.responseJSON.error === 'ratelimited') {
                delay += 100; // If rate limited error caught then we need to increase delay.
                console.log("Delay increased to:" + delay);
                messages.push(ts);
                setTimeout(deleteMessage, delay);
            }
        }
    });
}

// ---------------------------------------------------------------------------------------------------------------------

function processHistory() {

    jQuery.get(historyApiUrl + nextCursor, function(res) {

        const response = res;

        if (response.messages && response.messages.length > 0) {

            if (response.has_more) {
                nextCursor = response.response_metadata.next_cursor;
            }

            for (let i = 0; i < response.messages.length; i++) {
                if(response.messages[i].user == userID || userID == ''){
                    messages.push(response.messages[i].ts);
                }
            }

            if(!response.has_more && messages.length == 0){
               alert("Finished");
               window.location = window.location;
            }

            deleteMessage();
        }

    });
}

// ---------------------------------------------------------------------------------------------------------------------
if(confirm("Delete all your messages in current chat?")){
   processHistory();
}
