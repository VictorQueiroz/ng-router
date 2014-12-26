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
		if(hasState(stateName)) {
			return states[stateName];
		}
	}

	function hasState (stateName) {
		return states.hasOwnProperty(stateName);
	}

	// define a new state
	this.state = function (stateName, stateOptions) {
		// if the state already exists, throw a new error
		if(hasState(stateName)) {
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
			// Create a new variable to be filled with
			// all the important values of each views.
			var locals = {};

			// All the promises which will be resolveds at the final of the loop.
			var promises = [];

			// The state which we're trying to reach.
			var nextState = getState(stateName);

			// resolving each view of the state.
			forEach(nextState.views, function (view, viewName) {
				var viewLocals = locals[viewName] = angular.extend({}, view.resolve);

				// Defining the three view param there are not part of the resolve,
				// but sometimes need to be resolved. Example:
				// ```
				//   $stateProvider
				//     .state('a', {
				//		   views: {
				//         template: function () { return $http.get('/get-template.html').then(function (r) { return r.data; }) },
				//         controller: function ($http) {
				//           return $http.get('/api/get-controller').then(function (r) {
				//             return JSON.parse(r.data);
				//           });
				//         }
				//       }
				//		 })
				// ```
				forEach(['controller', 'controllerAs', 'template'], function (key) {
					var newKey = isString(key) && key.indexOf('$') <= -1 ? '$' + key : key;
					var value = view[key];

					// The result of each key will be '$KeyName'. Example:
					// - 'controller' will be '$controller'
					// - 'template' will be '$template'					
					if(!isDefined(value)) {
						return;
					}

					if(isString(value) || (isFunction(value) && key === 'controller')) {
						viewLocals[newKey] = function () {
							return value;
						};
					}

					if(isFunction(value) && key !== 'controller') {
						viewLocals[newKey] = value;
					}
				});

				// You cannot define two template options, you must choose, between
				// the 'template' option, and the 'templateUrl' option.
				if(isDefined(view.templateUrl) && isDefined(viewLocals.$template)) {
					throw new Error('You cannot define two template options, you must choose, ' +
						'between the \'template\' option, and the \'templateUrl\' option.');
				}

				// The 'templateUrl' option is just a wrapper to generate
				// a 'template' local using $http ant the template url path, to be resolved
				// at the final of the promises.
				if(isDefined(view.templateUrl)) {
					var $templateUrl = view.templateUrl;

					// Create a new local for stetic purposes.
					viewLocals.$templateUrl = function () {
						return $templateUrl;
					}

					// The most important local, which will be loaded by the view later.
					viewLocals.$template = function ($templateUrl, $templateCache, $http) {
						// If we don't find the templateUrl at the $templateCache,
						// go make a http request trying to find our template.
						return $q.when(($templateCache.get($templateUrl) ||	$http.get($templateUrl)))
							.then(function (r) {
								return (r.data || r);
							});
					};
				}

				// Resolving all the state dependencies and templates.
				var promise = $async.resolve(viewLocals);

				// Pushing the promise to a variable to resolve later, we don't need to manipulate
				// the return value from the promise, for the $async.resolve already change the
				// 'viewLocals' variable for us, with his resolved value.
				promises.push(promise);
			});

			$state.current = nextState;
			$state.current.locals = locals;

			// all the state dependencies
			// has been solved, now tell to
			// the views to render
			$q.all(promises).then(function () {
				$rootScope.$broadcast('$stateChangeSuccess');
			});
		};

		return $state;
	};
}

angular.module('ngRouter.state', ['ngRouter.async'])
	.provider('$state', $StateProvider);