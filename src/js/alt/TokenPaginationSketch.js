// concrete class wrapping up state that is held during pagination.
// has nothing to do with caching, expiration, or tracking where the caller
// is in the pagination.  that's up to them; this just wraps up implicit state
// of requests for previous pages.
//
// aside: are page tokens consistent?  or do they represent a view of data at a specific
// point in time, and will not update to include new results?  that would make sense,
// and would also suggest these tokens are stable and consistent.
//
// token-based pagination:
// 1) request(token, maxResults) -> [token, response]
// 2) add(prevToken, prevResponse, nextToken, nextResponse) -> [token, response]
// 3) close over the response state.
//
// composition of caching, pagination are important.  the token pagination class
// doesn't know about caching or query specifics.
class TokenPaginatedState {
  constructor(initialState, options) {
    this.state = initialState;
    this.requestFn = options.requestFn;
    this.mergeFn = options.mergeFn; // takes (state, response) -> [state, token]
  },

  // Returns a promise with [nextState, nextToken].
  makeRequest(token, maxResults) {
    requestFn(token, maxResults).done(response =>
      var [nextState, nextToken] = this.mergeFn(this.state, response)
      this.state = nextState;
      return [nextState, nextToken];
    );
  },
}



  // This is how it would be used in a view component
  componentDidMount() {
    this.tokenPaginatedState = this.createPaginatedThreadsState();
  },

  // If the component tracks nextPageToken, maxResults, and any other params itself (e.g.,
  // the query itself), then it can glue this all together.  It can also use a cache as
  // well to speed up the paging, while keeping the pagination mechanics agnostic of the
  // cache.
  createPaginatedThreadsState(): {
    new TokenPaginatedState({
      initialState: {
        resultSizeEstimate: 0,
        threadsWithMessages: [],
      },
      requestFn: this.requestThreadPage,
      mergeFn: this.mergeThreadPage,
    });
  },

  // Closes over component state that may change, like the query.
  // TODO(kr) is this even needed, with the lifecycle guarantees?
  requestThreadPage(pageToken, maxResults) => {
    return this.cachingRequestManager.requestWithCache(ThreadsWithMessagesAPI.makeRequest, {
      query: query,
      pageToken: pageToken,
      maxResults: maxResults,
    });
  },

  mergeThreadPage(prevState, nextPageResponse):Object {
    var nextState = {
      resultSizeEstimate: (prevState.resultSizeEstimate || 0) + nextPageResponse.resultSizeEstimate,
      threadsWithMessages: prevState.threadsWithMessages.concat(nextPageResponse.threadsWithMessages),
    };
    var nextToken = nextPageResponse.nextPageToken;
    return [nextState, nextToken];
  },

  // TODO(kr) the whole problem here is we're catching an ephemeral action, the
  // user scrolling down, and wanting that to trigger a page.  We could track
  // which page tokens have been requested, and wait for that to be reflected in
  // the component's state.
  componentWillUpdate(nextProps:Object, nextState:Object) {
    // if we're done paginating.
    if (nextState.maxResults >= nextState.threadsWithMessages.length) {
      return;
    } else if (nextState.pageToken === null) {
      return;
    }

    // kick off request
    this.tokenPaginatedState.makeRequest(nextState.pageToken, nextState.maxResults).then(this.onThreadPageMerged);
  },

  onThreadPageMerged(nextState, nextToken) {
    this.setState({
      pageToken: nextToken,
  },



  // This is how it would be used in a view component
  getInitialState() {
    return {
      // feels more like a list of independent enums that change state.
      desiredTokens: [null],
      requestedTokens: [],
      receivedTokens: [],
    };
  },

  componentDidMount() {
    this.paginatedThreadsServiceWithCache = this.createPaginatedThreadsServiceWithCache();
    this.requestThreadsIfNeeded();
  },

  componentDidUpdate(nextProps:Object, nextState:Object) {
    this.requestThreadsIfNeeded();
  },

  requestThreadsIfNeeded() {
    var tokensToRequest = _.difference(this.desiredTokens, this.requestedTokens);
    tokensToRequest.forEach(tokenToRequest =>
      this.paginatedThreadsServiceWithCache.makeRequest(tokenToRequest, this.state.maxResults)
        .then(serverState =>
          this.setState({
            receivedTokens: this.state.receivedTokens.concat(tokenToRequest),
            // nextPageToken: TODO(kr) race conditions here, need to slow down and think
            serverState: serverState});
    );
    if (this.
      return this.requestThreads();
    } else if (this.state.requestedTokensreceivedTokens

    this.paginatedThreadsServiceWithCache.
  },