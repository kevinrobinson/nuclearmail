/** @flow */

require('es6-shim');

// Modified code
var SearchBox = require('./SearchBox');
var ThreadsWithMessagesAPI = require('./ThreadsWithMessagesAPI');
var ThreadView = require('./ThreadView');
var Scroller = require('../Scroller');

// Original code
var API = require('../API');
var BlockMessageList = require('../BlockMessageList');
var Button = require('../Button');
var Colors = require('../Colors');
var CSSAnimation = require('../CSSAnimation');
var InteractiveStyleMixin = require('../InteractiveStyleMixin');
var KeybindingMixin = require('../KeybindingMixin');
// var LabelStore = require('./LabelStore');
var LoginModal = require('../LoginModal');
// var MessageStore = require('../MessageStore');
var Nav = require('../Nav');
var React = require('react');
// var StoreToStateMixin = require('./StoreToStateMixin');
// var ThreadActions = require('./ThreadActions');
// var ThreadStore = require('./ThreadStore');
var _ = require('lodash');
var asap = require('asap');
var moment = require('moment');

// var PureRenderMixin = React.addons.PureRenderMixin;


// Flow types I added:
type Promise<T> = {then: (x: T) => Promise<any>};
var AuthorizationEnum = {
  NOT_AUTHORIZED: 'not_authorized',
  AUTHORIZED: 'authorized',
  AUTHORIZING: 'authorizing',
};

moment.locale('en', {
  calendar : {
    lastDay : 'MMM D',
    sameDay : 'LT',
    nextDay : 'MMM D',
    lastWeek : 'MMM D',
    nextWeek : 'MMM D',
    sameElse : 'L'
  }
});

var pulseAnimation = new CSSAnimation({
  '0%':   {width: '10%'},
  '50%':  {width: '50%'},
  '100%': {width: '10%'},
});

var styles = {
  app: {
    paddingTop: '20px',
  },

  header: {
    display: 'flex',
  },

  logo: {
    color: Colors.accent,
    fontSize: '24px',
    fontWeight: 'bold',
    lineHeight: '32px',
    marginLeft: '12px',
  },

  logoName: {
    marginRight: '12px',
  },

  search: {
    marginLeft: '12px',
  },

  refresh: {
    marginLeft: '12px',
  },

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

  spinner: {
    left: 0,
    position: 'fixed',
    top: 0,
    width: '100%',
    zIndex: 10000,
  },

  spinnerInner: {
    WebkitAnimation: pulseAnimation + ' 3s ease 0s infinite',
    background: Colors.accent,
    height: '4px',
    margin: '0 auto',
  },

  messageLoading: {
    textAlign: 'center',
    padding: '20px',
  },
};


// Expose React for the dev tools
window.React = React;

/* sketch!
This changes `labels` to have all labels in the navigation.

App @state:{ query, labels, threadsCache, messagesCache }
  SearchBar{ query, onQueryChanged }
  Labels{ labels, onLabelClicked }
  Contents{ query, labels, threadsCache, messagesCache }, @state:{ threads, selectedThreadId, maxResults }
    Threads{ threads, selectedThreadId, maxResults } onThreadClicked, onWantsMoreThreads }
    Messages{ threadId, messages }
      ButtonBar{ threadId, onThreadAddedLabel, onThreadRemovedLabel }
      List<Message>{ message }
*/




var App = React.createClass({
  mixins: [
    InteractiveStyleMixin({
      logo: ['matchMedia'],
    }),
  ],

  getInitialState(): Object {
    return {
      isServerRequestActive: true, // TODO(kr) re-plumb api to keep this, threading it down
      authorizationState: 'not_authorized',
      labels: null, // Array or null
      query: 'in:inbox',
      // TODO(kr)
      // threadsCache: @props.threadsCache ? new Cache(),
      // messagesCache: @props.threadsCache ? new Cache(),
    };
  },

  componentDidMount() {
    // TODO(kr) cleanup event listening and cleanup
    // TODO(kr) create api, auth, etc.
    // right now this is threaded implicitly with the global singleton
    API.subscribe('isAuthorized', this.onAuthorizationChanged);
    this.listenForApiRequests();

    // TODO(kr) should do this only after authorized
    this.requestLabels().then(this.onLabelsLoaded);
  },

  listenForApiRequests() {
    API.subscribe('start', this.onServerRequestStateChanged.bind(this, true));
    API.subscribe('allStopped', this.onServerRequestStateChanged.bind(this, false));
  },

  onServerRequestStateChanged(isRequestActive: boolean) {
    this.setState({isServerRequestActive: isRequestActive});
  },

  onAuthorizationChanged(isAuthorized: boolean) {
    this.setState({
      authorizationState: isAuthorized ? AuthorizationEnum.AUTHORIZED : AuthorizationEnum.NOT_AUTHORIZED
    });
  },

  // TODO(kr) split these mechanics out, they're stateless.
  requestLabels() {
    return API.wrap(() =>
      API.execute(gapi.client.gmail.users.labels.list({userId: 'me'})).then(response => response.labels)
    );
  },

  onLabelsLoaded(labels: Array<Object>) {
    console.log('loaded labels');
    this.setState({
      isServerRequestActive: false,
      labels: labels
    });
  },

  onQueryChanged(query: string) {
    console.log('onQueryChanged', query);
    this.setState({query});
  },

  // TODO(kr) how would refresh work without global state or refactoring?
  // could do this by invalidating the caches, and having others listen for that, but
  // that introduces a side channel of communication.
  onRefresh() {
  },

  onLogoClick() {
    window.location.reload();
  },

  render(): any {
    return (
      <div style={styles.app}>
        {this.renderLoadingIndicator()}
        <div style={styles.header}>
          {this.renderLogo()}
          <SearchBox
            style={styles.search}
            query={this.state.query}
            onQueryChanged={this.onQueryChanged}
          />
          <Button style={styles.refresh} onClick={this.onRefresh}>⟳</Button>
        </div>
        <Nav
          onQueryChanged={this.onQueryChanged}
          query={this.state.query}
        />
        {this.renderAuthorizationOrContent()}
      </div>
    );
  },

  renderLoadingIndicator(): any {
    return this.state.isServerRequestActive ? (
      <div style={styles.spinner}>
        <div style={styles.spinnerInner} />
      </div>
    ) : null;
  },

  renderLogo(): any {
    return (
      <span style={styles.logo} onClick={this.onLogoClick}>
        ☢
        {!this.interactions.logo.matchMedia('(max-width: 800px)') ? (
          <span style={styles.logoName}>{' '}NUCLEARMAIL</span>
        ) : null}
      </span>
    );
  },

  renderAuthorizationOrContent(): any {
    if (this.state.authorizationState === AuthorizationEnum.AUTHORIZED) {
      return this.renderContent();
    } else if (this.state.authorizationState == AuthorizationEnum.NOT_AUTHORIZED) {
      return this.renderLogin();
    } else if (this.state.authorizationState == AuthorizationEnum.AUTHORIZING) {
      return <div>authorizing...</div>;
    } else {
      throw new Error('invalid authorizationState', this.state.authorizationState);
    }
  },

  renderLogin(): any {
    return (this.state.authorizationState === AuthorizationEnum.NOT_AUTHORIZED) ? <LoginModal /> : null;
  },

  // TODO(kr) better factoring with loading labels
  renderContent(): any {
    if (!this.state.labels) {
      return <div>loading labels...</div>;
    }

    return (
      <MailContents
        key={this.state.query}
        query={this.state.query}
        labels={this.state.labels}
      />
    );
  }
});


// TODO(kr) split out to another file
var MailContents = React.createClass({
  propTypes: {
    query: React.PropTypes.string.isRequired,
    labels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    // threadsCache={this.state.threadsCache}
    // messagesCache={this.state.messagesCache}
    pageSize: React.PropTypes.number
  },

  getDefaultProps() {
    return {
      pageSize: 5,
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
    this.requestThreadsWithMessages().then(this.onThreadsWithMessagesLoaded);
  },

  // TODO(kr) wrap in cache
  // this api call is stateless, but good to call out that api is stateless,
  // also to describe the mechanics of aborting requests
  // TODO(kr) will need to refactor the API to simplify it and pull out
  // dispatcher calls.  Basically, we're making things more complex by decoupling
  // on artificial seams.
  // This couples the threads and messages requests, since we need both to do
  // anything in the UI.
  // TODO(kr) improve typing here
  requestThreadsWithMessages():Promise<any> {
    return ThreadsWithMessagesAPI.makeRequest({
      query: this.props.query,
      maxResults: this.state.maxResults
    });
  },

  onThreadsWithMessagesLoaded(threadsWithMessagesResponse: Object):void {
    this.setState({threadsWithMessagesResponse});
  },

  // TODO(kr) this doesn't actually page, but requests the whole set again
  onRequestMoreThreads():void {
    this.setState({maxResults: this.state.maxResults + this.props.pageSize});
  },

  // TODO(kr) this is really about a Thread being selected, but not refactoring
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

  getSelectedMessageId():number {
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
      return <div>loading emails...</div>;
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
    console.log('renderThreads for threadsWithMessages: ', threadsWithMessages);
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
    // return (
    //   <div style={styles.messagesList}>
    //     <BlockMessageList
    //       labels={this.props.labels}
    //       messages={lastMessages}
    //       onMessageSelected={this.onMessageSelected}
    //       selectedMessageID={this.getSelectedMessageId()}
    //     />
    //     {this.renderMoreThreadsMessage()}
    //   </div>
    // );
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


React.render(<App />, document.querySelector('#app'));