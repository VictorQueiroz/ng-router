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

	State.prototype.getParents = function () {
		return getParents(this.name);
	};

	State.prototype.getPath = function () {
		return getPath(this.name);
	};

	function getParents (stateName) {
		var parents = [];

		// Split the name of the state into all dots.
		stateName.split(/\./).forEach(function (key, index, array) {
		  var state;

		  if(index === 0) {
		    state = key;
		  }

			if(index > 0) {
			  state = array[0];

			  state += '.';

			  array.slice(1, index + 1).forEach(function (key, index, array) {
			    state += key;

			    if(index < array.length - 1) {
			      state += '.';
			    }
			  })
			}

		  parents.push(state);
		});

		return parents;
	}

	function getState (stateName) {
		if(hasState(stateName)) {
			return states[stateName];
		}
	}

	function hasState (stateName) {
		return states.hasOwnProperty(stateName);
	}

	// Get the entire state url from the given
	// state to the of it's parents.
	function getPath (stateName) {
		var path = '';
		var state = getState(stateName);

		getParents(state.name).forEach(function (stateName) {
			var parent = getState(stateName);

			path += parent.url;
		});

		return path;
	}

	// define a new state
	this.state = function (stateName, stateOptions) {
		// if the state already exists, throw a new error
		if(hasState(stateName)) {
			throw new Error('The state ' + stateName + ' are already defined!');
		}

		if(!isDefined(stateOptions.url)) {
			throw new Error('The state must have an url');
		}

		var state = states[stateName] = new State(stateName, stateOptions);

		if(stateName.match(STATE_PARENT_REGEXP)) {
			var parentName = stateName.replace(STATE_PARENT_REGEXP, '');

			state.setParent(parentName);
		}

		return this;
	};

	this.$get = function $StateFactory ($rootScope, $injector, $q, $async, $url, $location) {
		var $state = {};

		$state.go = function (stateName, stateParams) {
			var path;
			var state = getState(stateName);
			var parents = state.getParents();

			// Translate the parsed 'stateParams' to the new url
			// which will be changed using $location.path by the
			// $urlProvider.
			path = state.getPath();
			path = $url.params(path, stateParams);

			return all(parents, stateParams).then(function (states) {
				states.forEach(function (current) {
					$state.current = current;

					$rootScope.$broadcast('$viewContentLoading');
				});

				$url.go(path, stateParams);
			});
		};

		$state.prepare = prepare;

		// Resolves a bunch of states and return as a promise.
		function all (states) {
			forEach(states, function (stateName, key) {
				if(!isString(stateName)) {
					throw new Error('The state name should be a string.');
				}

				var state = getState(stateName);

				states[key] = prepare(state.name);
			});

			return $q.all(states);
		}

		// Resolves all the dependencies of a state, and return it in a promise.
		function prepare (stateName, options) {
			// Create a new variable to be filled with
			// all the important values of each views.
			var locals = {};

			// All the promises which will be resolveds at the final of the loop.
			var promises = [];

			// The state which we're trying to reach.
			var nextState = getState(stateName);

			if(!isDefined(nextState)) {
				throw new Error('There is not state named ' + stateName);
			}

			if(!isDefined(options)) {
				options = {
					locals: {}
				};
			}

			if(isObject(options.locals)) {
				extend(locals, options.locals);
			}

			// resolving each view of the state.
			forEach(nextState.views, function (view, viewName) {
				var viewLocals = locals[viewName] = {};

				// Throw all that we have in the view resolve object into the locals
				// to be resolved and used to the view when everything is ready to use.
				extend(viewLocals, view.resolve);

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

					if(isFunction(value) && newKey !== '$controller') {
						viewLocals[newKey] = value;
					}

					if(isString(value) || (isFunction(value) && newKey === '$controller')) {
						viewLocals[newKey] = function () {
							return value;
						};
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
								// Must save this template in $templateCache for future use.
								$templateCache.put($templateUrl, r.data);

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

			var current = nextState;
			current.locals = locals;

			// All the state dependencies
			// has been solved, now return
			// a promise with this data, which
			// can be used by any 'stView' directive
			return $q.all(promises).then(function () {
				return current;
			});
		}

		return $state;
	};
}

angular.module('ngRouter.state', ['ngRouter.async', 'ngRouter.url'])
	.value('$stateParams', {})
	.provider('$state', $StateProvider);