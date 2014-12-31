/** @flow */
/* global gapi */

var API = require('../API.js');
var MessageTranslator = require('../MessageTranslator');
var RSVP = require('rsvp');
var _ = require('lodash');

// Refactored the API calls to simplify it and pull out interactions with the
// Dispatcher.  Basically, we're making things more complex by decoupling
// on artificial seams.
// This couples the threads and messages requests, since we need both to do
// anything in the UI.
// This also decouples API mechanics from caching semantics, which is where the real
// source of complexity it.
// TODO(kr) This doesn't expose a way for callers to abort or retry requests, which is
// not great from an architectural perspective, especially considering there are chains
// of requests here.

function zipThreadsAndMessages(threadsResponse: Object, messagesResponse: Object) {
  var threadIds = (threadsResponse.threads || []).map(thread => thread.id);
  var threadsWithMessages = threadIds.map(threadId => {
    var thread = messagesResponse[threadId].result;
    var messagesInThread = thread.messages.map(MessageTranslator.translate);
    return {
      id: threadId,
      messages: messagesInThread
    };
  });

  return {
    nextPageToken: threadsResponse.nextPageToken || null,
    resultSizeEstimate: threadsResponse.resultSizeEstimate || null,
    threadsWithMessages: threadsWithMessages,
  };
}

function requestForAllMessagesInThreads(threadIds: Array<number>) {
  var batch = gapi.client.newHttpBatch();
  threadIds.forEach(id => {
    batch.add(
      gapi.client.gmail.users.threads.get({userId: 'me', id}),
      {id}
    );
  });
  return batch;
}


function makeRequest(
  options: {maxResults: number; query: ?string; pageToken: ?string}
) {
  return API.wrap(() => {
    var threadsPromise = API.execute(gapi.client.gmail.users.threads.list({
      userId: 'me',
      maxResults: options.maxResults,
      q: options.query || null,
      pageToken: options.pageToken || null,
    }));

    return threadsPromise.then(threadsResponse => {

      var threadIds = (threadsResponse.threads || []).map(m => m.id);
      if (threadIds.length === 0) {
        return zipThreadsAndMessages(threadsResponse, {});
      }

      var batchMessagesRequest = requestForAllMessagesInThreads(threadIds);
      console.log('makeRequest: batch request for threadIds.length: ', threadIds.length);
      return API.execute(batchMessagesRequest).then(messagesResponse => {
        return zipThreadsAndMessages(threadsResponse, messagesResponse);
      });
    });
  });
}

module.exports = {
  makeRequest,
};
