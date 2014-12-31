/** @flow */

var Button = require('../Button');
var Colors = require('../Colors');
var React = require('react');

var PropTypes = React.PropTypes;

// TODO(kr) It's unfortunate that the transient local state about the query in the input
// box has to leak out to the highest-level application state in the Flux example.  This
// is so the auto-wiring of the prop change flowing to the input component works as expected.
// So here we do the unfortunate work of manually keep these in sync with prop changes
// to avoid that.
var SearchBox = React.createClass({
  propTypes: {
    onQueryChanged: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
  },

  getInitialState(): { inputValue: string } {
    return {
      inputValue: this.props.query,
    };
  },

  componentWillReceiveProps(nextProps): void {
    this.setState({ inputValue: nextProps.query });
  },

  triggerQueryChanged(): void {
    this.props.onQueryChanged(this.state.inputValue);
  },

  onInputChanged(e: Object) {
    this.setState({ inputValue: e.target.value });
  },

  onInputKeyDown(e: Object) {
    if (e.key === 'Enter') {
      this.triggerQueryChanged();
    }
  },

  onSearchClicked() {
    this.triggerQueryChanged();
  },

  render(): any {
    return (
      <span style={this.props.style}>
        <input
          autoFocus="true"
          style={styles.input}
          value={this.state.inputValue}
          onChange={this.onInputChanged}
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
