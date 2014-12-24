'use strict';

// it will match the (.stateName) at the final of the state name
// and delete findind with that way, the parent state
var STATE_PARENT_REGEXP = /([\.][a-z]{0,})$/;

function $StateProvider () {
	var states = this.states = {};

	function State (stateName, stateOptions) {
		var state = this;

		this.name = stateName;

		forEach(stateOptions, function (option, key) {
			this[key] = option;
		}, this);

		this.parent = null;
	}

	State.prototype.isParent = function () {
		return this.parent === null;
	};

	State.prototype.setParent = function (stateName) {
		if(!isDefined(states[stateName])) {
			throw new Error('There is no state called ' + stateName);
		}

		this.parent = states[stateName];
	};

	function getState (stateName) {
		return states[stateName];
	}

	// define a new state
	this.state = function (stateName, stateOptions) {
		// if the state already exists, throw a new error
		if(isDefined(states[stateName])) {
			throw new Error('The state ' + stateName + ' are already defined!');
		}

		var state = states[stateName] = new State(stateName, stateOptions);

		if(stateName.match(STATE_PARENT_REGEXP)) {
			var parentName = stateName.replace(STATE_PARENT_REGEXP, '');

			state.setParent(parentName);
		}

		return this;
	};

	this.$get = function $StateFactory ($rootScope, $injector, $q, $async) {
		var $state = {};

		$state.go = function (stateName) {
			var locals = {};
			var promises = [];
			var nextState = getState(stateName);

			forEach(nextState.views, function (view, viewName) {
				var viewLocals = locals[viewName] = angular.extend({}, view.resolve);

				viewLocals.$template = function () {
					return view.template;
				};

				// resolving all the state dependencies and templates
				$async.forEach(viewLocals, function (value, key) {
					var next = this.next;
					var promise = isString(value) ? $injector.get(value) : $injector.invoke(value, {}, viewLocals);

					if(promise.then) {
						return promises.push(promise.then(function (value) {
							viewLocals[key] = value;

							next();

							return value;
						}));
					}

					viewLocals[key] = promise;

					next();
				});
			});

			$state.current = nextState;
			$state.current.locals = locals;

			$q.all(promises).then(function () {
				$rootScope.$broadcast('$stateChangeSuccess');
			});
		};

		return $state;
	};
}

angular.module('ngRouter.state', [])
	.provider('$state', $StateProvider);