/** @flow */

var Button = require('../Button');
var KeybindingMixin = require('../KeybindingMixin');
var MessageView = require('../MessageView');
var React = require('react');
var sx = require('../styleSet');

var PropTypes = React.PropTypes;
var _ = require('lodash');


// Added this, keeping the View coupled to the data structures in the API
var BuildInLabelKeys = {
  INBOX: 'inbox',
  STARRED: 'starred',
  UNREAD: 'unread',
};

var ThreadView = React.createClass({
  mixins: [
    KeybindingMixin,
  ],

  propTypes: {
    thread: PropTypes.object.isRequired,
    selectedMessageId: PropTypes.string, // may be null
    onThreadLabelRemoved: PropTypes.func.isRequired,
    onThreadLabelAdded: PropTypes.func.isRequired,
  },

  componentWillMount() {
    this.bindKey('y', this._archive);
  },

  _archive() {
    this.props.onThreadLabelRemoved(this.props.thread, BuildInLabelKeys.INBOX);
  },

  _moveToInbox() {
    this.props.onThreadLabelAdded(this.props.thread, BuildInLabelKeys.INBOX);
  },

  _markAsUnread() {
    this.props.onThreadLabelRemoved(this.props.thread, BuildInLabelKeys.UNREAD);
  },

  _star() {
    this.props.onThreadLabelAdded(this.props.thread, BuildInLabelKeys.STARRED);
  },

  _unstar() {
    this.props.onThreadLabelRemoved(this.props.thread, BuildInLabelKeys.STARRED);
  },

  render(): ?Object {
    var messages = this.props.thread.messages;
    if (!messages) {
      return null;
    }

    var isStarred = messages.some(m => m.isStarred);
    var isInInbox = messages.some(m => m.isInInbox);

    return (
      <div style={sx(styles.root, this.props.style)}>
        <ul style={styles.actionBar}>
          {isInInbox ? (
            <li style={styles.actionBarItem}>
              <Button onClick={this._archive}>Archive</Button>
            </li>
          ) : (
            <li style={styles.actionBarItem}>
              <Button onClick={this._moveToInbox}>To Inbox</Button>
            </li>
          )}
          <li style={styles.actionBarItem}>
            <Button onClick={this._markAsUnread}>Unread</Button>
          </li>
          {isStarred ? (
            <li style={styles.actionBarItem}>
              <Button onClick={this._unstar}>Unstar</Button>
            </li>
          ) : (
            <li style={styles.actionBarItem}>
              <Button onClick={this._star}>Star</Button>
            </li>
          )}
        </ul>
        <div style={styles.messages}>
          {messages.map(message => (
            <MessageView
              key={message.id}
              message={message}
              isExpandedInitially={message.id === this.props.selectedMessageId}
            />
          ))}
        </div>
      </div>
    );
  }
});

var styles = {
  root: {
    height: '100%',
  },

  actionBar: {
    padding: '0 12px 12px 12px'
  },

  actionBarItem: {
    display: 'inline-block',
    marginRight: '12px',
  },

  messages: {
    boxSizing: 'border-box',
    height: 'calc(100% - 57px)',
    overflow: 'auto',
    paddingBottom: '12px',
  },
};

module.exports = ThreadView;
