/** @flow */
/* global gapi */

var API = require('../API.js');
var MessageTranslator = require('../MessageTranslator');
var RSVP = require('rsvp');
var _ = require('lodash');

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
    nextPageToken: threadsResponse.nextPageToken || 0,
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

      // TODO(kr) remove cap on messages
      var batchMessagesRequest = requestForAllMessagesInThreads(_.first(threadIds, 5))
      console.log('makeRequest: batch request for TRUNCATED messages: ', _.first(threadIds, 5));
      return API.execute(batchMessagesRequest).then(messagesResponse => {
        return zipThreadsAndMessages(threadsResponse, messagesResponse);
      });
    });
  });
}

module.exports = {
  makeRequest,
};
