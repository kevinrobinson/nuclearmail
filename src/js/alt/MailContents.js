/** @flow */

require('es6-shim');
var React = require('react');
var _ = require('lodash');

var CachingRequestManager = require('./CachingRequestManager');
var ThreadsWithMessagesAPI = require('./ThreadsWithMessagesAPI');
var ThreadView = require('./ThreadView');
var Scroller = require('../Scroller');
var BlockMessageList = require('../BlockMessageList');

var styles = {
  messages: {
    bottom: 0,
    display: 'flex',
    left: 0,
    position: 'absolute',
    right: 0,
    top: '104px',
  },

  messagesList: {
    flex: 1,
    height: '100%',
    minWidth: '300px',
    maxWidth: '400px',
  },

  threadView: {
    flex: 2,
    height: '100%',
  },

  messageLoading: {
    textAlign: 'center',
    padding: '20px',
  },
};


module.exports = React.createClass({
  propTypes: {
    query: React.PropTypes.string.isRequired,
    labels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    threadsCache: React.PropTypes.object.isRequired,
    pageSize: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      pageSize: 10,
    };
  },

  getInitialState():Object {
    return {
      threadsWithMessagesResponse: null,
      selectedThreadId: null,
      maxResults: this.props.pageSize,
    };
  },

  // TODO(kr) lifecycle for receiving new props - this is the yuck
  componentDidMount() {
    this.cachingRequestManager = this.createCachingRequestManager();
    this.requestThreadsWithMessages().then(this.onLoadedThreadsWithMessages);

    // TODO(kr) key bindings belong here, since they manipulate this state, or does
    // this affect which element the binding occurs on?
    // this.bindKey('k', this._selectNextMessage);
    // this.bindKey('j', this._selectPreviousMessage);
  },

  createCachingRequestManager() {
    return new CachingRequestManager(this.props.threadsCache);
  },

  // TODO(kr) improve typing of generics here
  requestThreadsWithMessages():Promise<any> {
    return this.cachingRequestManager.requestWithCache(ThreadsWithMessagesAPI.makeRequest, {
      query: this.props.query,
      maxResults: this.state.maxResults,
    });
  },

  // TODO(kr) i get it!!!! :)
  // but why is this more complicated than the Scroller?  What's the right abstraction here?
  // the real state here is '{nextPageToken, maxResults}, with implicit {pages, resultSizeEstimate, threads}
  // the problem here is we want implicit state, we don't want to recompute every time, since
  // hitting the server is expensive.
  // should try to back up 2000 feet and see what makes sense.
  // TODO(kr) improve options map typing
  requestNextPageOfThreadsWithMessages(options):Promise<any> {
    console.log('requestNextPageOfThreadsWithMessages');
    return this.cachingRequestManager.requestWithCache(ThreadsWithMessagesAPI.makeRequest, {
      query: this.props.query,
      maxResults: options.maxResults,
      pageToken: options.pageToken
    });
  },

  onLoadedThreadsWithMessages(threadsWithMessagesResponse: Object):void {
    this.setState({threadsWithMessagesResponse});
  },

  // Merge it in!
  // TODO(kr) factor this out to a pageable collection, or something like that?
  onLoadedNextPageOfThreadsWithMessages(nextPageResponse: Object):void {
    console.log('onLoadedNextPageOfThreadsWithMessages');
    var currentResponse = this.state.threadsWithMessagesResponse;
    var threadsWithMessagesResponse = {
      nextPageToken: nextPageResponse.nextPageToken,
      resultSizeEstimate: (currentResponse.resultSizeEstimate || 0) + nextPageResponse.resultSizeEstimate,
      threadsWithMessages: currentResponse.threadsWithMessages.concat(nextPageResponse.threadsWithMessages),
    };
    this.setState({threadsWithMessagesResponse});
  },

  // TODO(kr) Keeping this as-is with NuclearMail for now, which means it
  // doesn't actually page, but requests a larger set.
  onRequestMoreThreads():void {
    console.log('onRequestMoreThreads', this.state.maxResults, this.props.pageSize);
    var nextMaxResults = this.state.maxResults + this.props.pageSize;
    this.setState({maxResults: nextMaxResults});

    // TODO(kr) the transition here is breaking down the React abstractions -
    // is it the state change that drives this?  should instead move
    this.requestNextPageOfThreadsWithMessages({
      pageToken: this.state.threadsWithMessagesResponse.nextPageToken,
      maxResults: nextMaxResults,
    }).then(this.onLoadedNextPageOfThreadsWithMessages);
  },

  // TODO(kr) this is really about a Thread being selected, but not going to refactor
  // the BlockMessageList for now.
  onMessageSelected(message: Object):void {
    this.onThreadSelected(message.threadID);
  },

  // TODO(kr) this updates state optimistically, and also side effects to the
  // server.  In the nuclear example, both these effects are in the top-level
  // app and in the component, not in an Action.
  onThreadSelected(threadId: number):void {
    this.setState({ selectedThreadId: threadId });
  },

  // TODO(kr)
  onThreadLabelAdded(thread: Object, label: string):void {
    console.log('thread label added', thread, label);
  },

  // TODO(kr)
  onThreadLabelRemoved(thread:Object, label:string):void {
    console.log('thread label removed', thread, label);
  },

  // TODO(kr) if this thread is no longer in the thread list, then
  // advance state to next thread.  The implementation in nuclear mail doesn't
  // quite handle this correctly, since if you're in an view that is showing archived
  // mail, this doesn't remove the thread.
  // Instead, can we remove this altogether and let the Action update the state and
  // remove it from the `thread` state, naturally tearing down the message view with it?
  // onThreadClosed():void {
  // },

  // Move this back to be computed, rather than precomputed and synced.
  // Optimize only by calling once in `render`.
  getLastMessages():Array<Object> {
    if (!this.state.threadsWithMessagesResponse) {
      return [];
    }

    var threadsWithMessages = this.state.threadsWithMessagesResponse.threadsWithMessages;
    return threadsWithMessages.map(threadWithMessages => {
      return _.last(threadWithMessages.messages);
    });
  },

  getSelectedThread():Object {
    return this.state.selectedThreadId && _.find(
      this.state.threadsWithMessagesResponse.threadsWithMessages,
      {id: this.state.selectedThreadId}
    );
  },

  getSelectedMessageId():?number {
    var selectedThread = this.getSelectedThread();
    return (selectedThread && selectedThread.messages.length > 0)
      ? _.last(selectedThread.messages).id
      : null;
  },

  // TODO(kr) factor out to helper, concretize this data type?
  hasMoreThreads():boolean {
    return !!this.state.threadsWithMessagesResponse.nextPageToken;
  },

  render():any {
    if (!this.state.threadsWithMessagesResponse) {
      return null;
    }
    return (
      <div style={styles.messages}>
        {this.renderThreads()}
        {this.renderMessagesInThread()}
      </div>
    );
  },

  renderThreads():any {
    var lastMessages = this.getLastMessages();
    if (lastMessages.length === 0) {
      return <div style={styles.messagesList} />;
    }

    var threadsWithMessages = this.state.threadsWithMessagesResponse.threadsWithMessages;
    // console.log('renderThreads for threadsWithMessages: ', threadsWithMessages);
    return (
      <Scroller
        style={styles.messagesList}
        hasMore={this.hasMoreThreads()}
        isScrollContainer={true}
        onRequestMoreItems={this.onRequestMoreThreads}>
        <div>
          <BlockMessageList
            labels={this.props.labels}
            messages={lastMessages}
            onMessageSelected={this.onMessageSelected}
            selectedMessageID={this.getSelectedMessageId()}
          />
          {this.renderMoreThreadsMessage()}
        </div>
      </Scroller>
    );
  },

  renderMoreThreadsMessage(): any {
    if (!this.hasMoreThreads()) {
      return null;
    }

    var pagingMessages = [
      'Still going?',
      'Now you\'re just getting greedy.',
      '\u266b I still haven\'t found what I\'m lookin\' for. \u266b',
      'I could go on forever.',
      'Perhaps you should narrow the search term?',
      'Look at you go!',
      '\u266b This is the song that never ends \u266b',
      '\u266b Scrollin, scrollin, scrollin through the emails \u266b',
      'Really?',
      'Give up, you\'ll never find it now.',
      'I know it must be here somewhere.',
      'You can do it!',
      'Eventually you\'ll just give up.',
      'Dig dig dig!'
    ];

    var threadsWithMessages = this.state.threadsWithMessagesResponse.threadsWithMessages;
    return (
      <div style={styles.messageLoading}>
        You{"'"}ve seen {threadsWithMessages.length}.
        {threadsWithMessages.length >= 100 ? (
          ' ' + _.sample(pagingMessages)
        ) : null}
        {' '}Loading more threads...
      </div>
    );
  },

  renderMessagesInThread(): any {
    var selectedThread = this.getSelectedThread();

    return (
      <div style={styles.threadView}>
        {selectedThread ? (
          <ThreadView
            thread={selectedThread}
            selectedMessageId={this.getSelectedMessageId()}
            onThreadLabelAdded={this.onThreadLabelAdded}
            onThreadLabelRemoved={this.onThreadLabelRemoved}
            // onThreadClosed={this.onThreadClosed} TODO(kr) can we remove this?
          />
        ) : null}
      </div>
    );
  },
});




// TODO(kr) experiment with defining these up top for this region of code.  these would
// be instance properties/methods on the component.
// TODO(kr) sketch of keeping localized registry of user actions, for
// understandability-at-a-glance.
//
// Usage API changes from:
//   onMessageSelected={this.onMessageSelected}
// to
// onMessageSelected={this.handleAction.bind(this, this.UserEvents.SELECTED_MESSAGE)}
//
// UserActions: {
//   REQUESTED_MORE_THREADS: 'REQUESTED_MORE_THREADS',
//   SELECTED_MESSAGE: 'SELECTED_MESSAGE',
//   ADDED_LABEL_TO_THREAD: 'ADDED_LABEL_TO_THREAD',
//   REMOVED_LABEL_TO_THREAD: 'REMOVED_LABEL_TO_THREAD',
// },
//
// handleAction: (action, ...payload) {
//   switch (action) {
//     case this.UserActions.REQUESTED_MORE_THREADS:
//       return this.onRequestMoreThreads();
//     case this.UserActions.SELECTED_MESSAGE:
//       var [message] = payload;
//       return this.UserActions.onMessageSelected(message);
//     case this.UserActions.ADDED_LABEL_TO_THREAD:
//       var [thread, label] = payload;
//       return this.onThreadLabelAdded(thread, label);
//       break;
//     case this.UserActions.REMOVED_LABEL_TO_THREAD:
//       var [thread, label] = payload;
//       return this.onThreadLabelRemoved(thread, label);
//   }
// },