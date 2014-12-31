/** @flow */

require('es6-shim');


// New code
var LRU = require("lru-cache");
var MailContents = require('./MailContents');

// Modified code
var SearchBox = require('./SearchBox');
var LoginModal = require('./LoginModal');

// Original code, unchanged
var API = require('../API');
var Button = require('../Button');
var Colors = require('../Colors');
var CSSAnimation = require('../CSSAnimation');
var InteractiveStyleMixin = require('../InteractiveStyleMixin');
var Nav = require('../Nav');
var React = require('react');
var _ = require('lodash');
var moment = require('moment');

// Unchanged, but factored out
// var BlockMessageList = require('../BlockMessageList');
// var ThreadView = require('./ThreadView');
// var Scroller = require('../Scroller');

// Removed from original code
// TODO(kr) why was asap needed in the first place?
// var asap = require('asap');
// var LabelStore = require('./LabelStore');
// var MessageStore = require('../MessageStore');
// var StoreToStateMixin = require('./StoreToStateMixin');
// var ThreadActions = require('./ThreadActions');
// var ThreadStore = require('./ThreadStore');
// var KeybindingMixin = require('../KeybindingMixin');
// var PureRenderMixin = React.addons.PureRenderMixin;


// Flow types I added:
type Promise<T> = {then: (x: T) => Promise<any>};
var AuthorizationStates = {
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
};


// Expose React for the dev tools
window.React = React;

/* sketch!
This changes `labels` to have all labels in the navigation.

App @state:{ query, labels, threadsCache }
  SearchBar{ query, onQueryChanged }
  Labels{ labels, onLabelClicked }
  Contents{ query, labels, threadsCache }, @state:{ threads, selectedThreadId, maxResults }
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
      threadsCache: this.props.threadsCache || this.createThreadCache(),
    };
  },

  // TODO(kr) this isn't really the API I want, but can add some
  // value right away.  It'll feel weird to users why these expire
  // every so often when working interactively.
  createThreadCache() {
    return LRU({
      max: 500,
      maxAge: 1000 * 60, // 1 minute
    });
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
      authorizationState: isAuthorized ? AuthorizationStates.AUTHORIZED : AuthorizationStates.NOT_AUTHORIZED
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
    if (this.state.authorizationState === AuthorizationStates.AUTHORIZED) {
      return this.renderContent();
    } else if (this.state.authorizationState == AuthorizationStates.NOT_AUTHORIZED) {
      return this.renderLogin();
    } else if (this.state.authorizationState == AuthorizationStates.AUTHORIZING) {
      return <div>authorizing...</div>;
    } else {
      throw new Error('invalid authorizationState', this.state.authorizationState);
    }
  },

  renderLogin(): any {
    return (this.state.authorizationState === AuthorizationStates.NOT_AUTHORIZED) ? <LoginModal /> : null;
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
        threadsCache={this.state.threadsCache}
      />
    );
  }
});



React.render(<App />, document.querySelector('#app'));