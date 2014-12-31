/** @flow */

require('es6-shim');

// Modified code
var SearchBox = require('./SearchBox');

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
var Scroller = require('../Scroller');
// var StoreToStateMixin = require('./StoreToStateMixin');
// var ThreadActions = require('./ThreadActions');
// var ThreadStore = require('./ThreadStore');
// var ThreadView = require('./ThreadView');
var _ = require('lodash');
var asap = require('asap');
var moment = require('moment');

// var PureRenderMixin = React.addons.PureRenderMixin;

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


// Expose React for the dev tools
window.React = React;

/* sketch!
This changes `labels` to have all labels in the navigation.

App @state:{ query, labels, threadsCache, messagesCache }
  SearchBar{ query, onQueryChanged }
  Labels{ labels, onLabelClicked }
  Contents{ query, labels, threadsCache, messagesCache }, @state:{ threads, selectedThreadId, maxResultCount }
    Threads{ threads, selectedThreadId, maxResultCount } onThreadClicked, onWantsMoreThreads }
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
      isLoading: true, // TODO(kr) re-plumb api to keep this, threading it down
      labels: [],
      query: '',
      // TODO(kr)
      // threadsCache: @props.threadsCache ? new Cache(),
      // messagesCache: @props.threadsCache ? new Cache(),
    };
  },

  componentDidMount() {
    // TODO(kr) create api, auth, etc.
    requestLabels().then(this.onLabelsLoaded);
  },

  // TODO(kr) split these mechanics out, they're stateless.
  requestLabels() {
    return API.wrap(() =>
      API.execute(gapi.client.gmail.users.labels.list({userId: 'me'}))
        .then(response => response.labels)
    );
  },

  onLabelsLoaded(labels: Array<object>) {
    this.setState({
      isLoading: false,
      labels: labels
    });
  },

  onQueryChanged(query: string) {
    this.setState({query});
  },

  // TODO(kr) how would refresh work without global state or refactoring?
  onRefresh() {
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
        {this.renderLogin()}
        {this.renderContents()}
      </div>
    );
  },

  renderLoadingIndicator(): any {
    return this.state.isLoading ? (
      <div style={styles.spinner}>
        <div style={styles.spinnerInner} />
      </div>
    ) : null;
  },

  renderLogo(): any {
    return (
      <span style={styles.logo} onClick={this._onLogoClick}>
        ☢
        {!this.interactions.logo.matchMedia('(max-width: 800px)') ? (
          <span style={styles.logoName}>{' '}NUCLEARMAIL</span>
        ) : null}
      </span>
    );
  },

  renderLogin(): any {
    return (!this.state.isAuthorizing && !this.state.isAuthorized) ? <LoginModal /> : null;
  },

  renderContents(): any {
    return (
      <MailContents
        query={this.state.query}
        labels={this.state.labels}
      />
    );
  }
});


var MailContents = React.createClass({
  propTypes: {
    query: React.PropTypes.string.isRequired,
    labels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    // threadsCache={this.state.threadsCache}
    // messagesCache={this.state.messagesCache}
    pageSize: React.PropTypes.number
  },

  getDefaultProps() {
    pageSize: 20
  },

  getInitialState() {
    return {
      threadsResponse: null,
      messagesResponse: null,
      selectedMessageId: null,
      selectedThreadId: null, // TODO(kr) would be nice to remove this duplication
      maxResultCount: this.props.pageSize,
    };
  },

  componentDidMount() {
    this.requestThreadsAndMessages().then(this.onThreadsAndMessagesLoaded);
  },

  // TODO(kr) wrap in cache
  // this api call is stateless, but good to call out that api is stateless,
  // also to describe the mechanics of aborting requests
  // TODO(kr) will need to refactor the API to simplify it and pull out
  // dispatcher calls.  Basically, we're making things more complex by decoupling
  // on artificial seams.
  // This couples the threads and messages requests, since we need both to do
  // anything in the UI.
  requestThreadsAndMessages() {
    ThreadsAndMessagesAPI.fetch({
      query: this.props.query,
      maxResultCount: this.state.maxResultCount
    });
  },

  onThreadsAndMessagesLoaded(threadsResponse: Object, messagesResponse: Object):void {
    this.setState({threadsResponse, messagesResponse});
  },

  onRequestMoreThreads():void {
    this.setState({maxResultCount: this.state.maxResultCount + this.props.pageSize});
  },

  // TODO(kr) this updates state optimistically, and also side effects to the
  // server.  In the nuclear example, both these effects are in the top-level
  // app and in the component, not in an Action.
  onThreadSelected(message: Object):void {
  },

  // TODO(kr)
  onThreadLabelAdded(thread: Object, label: string):void {
  },

  // TODO(kr)
  onThreadLabelRemoved(thread: Object, label: string):void {
  },

  // TODO(kr) if this thread is no longer in the thread list, then
  // advance state to next thread.  The implementation in nuclear mail doesn't
  // quite handle this correctly, since if you're in an view that is showing archived
  // mail, this doesn't remove the thread.
  // Instead, can we remove this altogether and let the Action update the state and
  // remove it from the `thread` state, naturally tearing down the message view with it?
  onThreadClosed():void {
  },

  // TODO(kr) move this back to be computed, rather than precomputed and synced.
  // optimize only by calling once in `render`.
  getLastMessages():Array<object> {

  },

  getSelectedThread():object {
    return this.state.selectedThreadId && _.find(
      this.state.threadsResponse.result.items,
      {id: this.state.selectedThreadId}
    );
  },

  render(): any {
    var lastMessages = this.getLastMessages();
    var selectedThread = this.getSelectedThread();

    return (
      <div style={styles.messages}>
        {lastMessages.result ? this.renderThreads(lastMessages) : (
          <div style={styles.messagesList} />
        )}
        <div style={styles.threadView}>
          {selectedThread ? (
            <ThreadView
              thread={selectedThread}
              selectedMessageId={this.state.selectedMessageId}
              onThreadLabelAdded={this.onThreadLabelAdded}
              onThreadLabelRemoved={this.onThreadLabelRemoved}
              // onThreadClosed={this.onThreadClosed} TODO(kr) can we remove this?
            />
          ) : null}
        </div>
      </div>
    );
  },

  renderThreads(lastMessages: Array<Object>):any {
    var threadsResult = this.state.threadsResponse.result;

    return (
      <Scroller
        style={styles.messagesList}
        hasMore={threadsResult.hasMore}
        isScrollContainer={true}
        onRequestMoreItems={this.onRequestMoreThreads}>
        <BlockMessageList
          labels={this.props.labels}
          messages={lastMessages.result}
          onThreadSelected={this.onThreadSelected}
          selectedMessageId={this.state.selectedMessageId}
        />
        {threadsResult.hasMore ? (
          <div style={styles.messageLoading}>
            You{"'"}ve seen {threadsResult.items.length}.
            {threadsResult.items.length >= 100 ? (
              ' ' + _.sample(pagingMessages)
            ) : null}
            {' '}Loading more...
          </div>
        ) : null}
      </Scroller>
    );
  },
});


React.render(<App />, document.body);