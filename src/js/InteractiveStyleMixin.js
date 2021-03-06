/** @flow */

var ClientID = require('./ClientID');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var classToMixinFunction = require('./classToMixinFunction');

var emitter = new EventEmitter();

document.body.addEventListener('mouseup', event => {
  emitter.emit('mouseup', event);
});

class Interaction {
  constructor(id, component, requestedInteractions) {
    this._id = id;
    this._component = component;
    this.props = {};
    this._mediaQueries = {};
    this._teardownFunctions = [];
    this._requestedInteractions = requestedInteractions;

    if (
      _.contains(requestedInteractions, 'hover') ||
      _.contains(requestedInteractions, 'active')
    ) {
      this.props.onMouseEnter = this._onMouseEnter.bind(this);
      this.props.onMouseLeave = this._onMouseLeave.bind(this);
    }

    if (_.contains(requestedInteractions, 'active')) {
      this.props.onMouseUp = this._onMouseUp.bind(this);
      this.props.onMouseDown = this._onMouseDown.bind(this);
      this.props.onClick = this._onClick.bind(this);
      emitter.addListener('mouseup', this.props.onMouseUp);
      this._teardownFunctions.push(() => {
        emitter.removeListener('mouseup', this.props.onMouseUp);
      });
    }
  }

  teardown() {
    this._teardownFunctions.forEach(t => t());
  }

  isHovering() {
    if (!_.contains(this._requestedInteractions, 'hover')) {
      throw new Error(
        'You must request the `hover` interaction to use isHovering'
      );
    }
    return this._getState('isHovering');
  }

  isActive() {
    if (!_.contains(this._requestedInteractions, 'active')) {
      throw new Error(
        'You must request the `active` interaction to use isActive'
      );
    }
    return this._getState('isActive');
  }

  _onMouseEnter() {
    this._setState({
      isHovering: true,
      isActive: this._getState('isMouseDown'),
    });
  }

  _onMouseLeave() {
    this._setState({
      isHovering: false,
      isActive: false,
    });
  }

  _onMouseUp() {
    this._setState({
      isActive: false,
      isMouseDown: false,
    });
  }

  _onMouseDown() {
    this._setState({
      isActive: true,
      isMouseDown: true,
    });
  }

  // Sometimes a quick tap registers the mousedown and up events
  // at the same time, and the active state never renders.
  _onClick() {
    this._setState({
      isActive: true,
      isMouseDown: true,
    });

    setTimeout(() => {
      this._setState({
        isActive: false,
        isMouseDown: false,
      });
    }, 100);
  }

  matchMedia(mediaQuery) {
    if (!this._mediaQueries[mediaQuery]) {
      this._mediaQueries[mediaQuery] = window.matchMedia(mediaQuery);
      var bound = this._onMediaQueryChange.bind(this, mediaQuery);
      this._mediaQueries[mediaQuery].addListener(bound);
      this._teardownFunctions.push(() => {
        this._mediaQueries[mediaQuery].removeListener(bound);
      });
    }
    return this._mediaQueries[mediaQuery].matches;
  }

  _onMediaQueryChange(query, mediaQueryList) {
    var state = {};
    state[query] = mediaQueryList.matches;
    this._setState(state);
  }

  _setState(newInteractionState) {
    var state = {};
    var interactionState = (this._component.state || {})[this._id] || {};

    if (_.isEqual(interactionState, newInteractionState)) {
      return;
    }

    interactionState = {...interactionState, ...newInteractionState};
    state[this._id] = interactionState;
    this._component.setState(state);
  }

  _getState(name) {
    return ((this._component.state || {})[this._id] || {})[name];
  }
}

class InteractiveStyleMixin {
  constructor(component, config) {
    this._component = component;
    this._component.interactions =
      _.mapValues(config, (requestedInteractions, interactionID) => {
        return new Interaction(interactionID, component, requestedInteractions);
      });
  }

  componentWillUnmount() {
    _.invoke(this._component.interactions, 'teardown');
  }
}

module.exports = classToMixinFunction(InteractiveStyleMixin);
