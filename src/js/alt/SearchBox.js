/** @flow */

var Button = require('../Button');
var Colors = require('../Colors');
var React = require('react');

var PropTypes = React.PropTypes;

var SearchBox = React.createClass({
  propTypes: {
    onQueryChanged: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
  },

  onInputKeyDown(e: Object) {
    if (e.key === 'Enter') {
      this.props.onQueryChanged(this.props.query);
    }
  },

  onSearchClicked() {
    this.props.onQueryChanged(this.props.query);
  },

  render(): any {
    return (
      <span style={this.props.style}>
        <input
          style={styles.input}
          value={this.props.query}
          onKeyDown={this.onInputKeyDown}
          type="search"
        />
        <Button
          onClick={this.onSearchClicked}
          use="special">
          Search
        </Button>
      </span>
    );
  }
});

var styles = {
  input: {
    marginRight: '8px',
    width: '400px',
  },
};

module.exports = SearchBox;
