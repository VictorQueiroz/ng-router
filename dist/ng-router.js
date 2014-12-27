'use strict';

angular.module('ngRouter.async', [])
	.provider('$async', function $AsyncProvider () {
		this.$get = function $AsyncFactory ($q, $injector) {
			var $async = {};

			$async.forEach = forEach;

			$async.resolve = resolve;

			// resolves an object with dependencies
			// invoke each key value with $injector
			// solves all the promises queued and then
			// resolve the resolve function promise
			function resolve (obj, locals) {
				var promises = [];
				var deferred = $q.defer();

				if(!locals) {
					locals = {};
				}

				forEach(obj, function (value, key) {
					var done = this.done;
					var next = this.next;
					var promise = isString(value) ? $injector.get(value) : $injector.invoke(value, {}, obj);

					// if is a promise, add it to the promises variable
					// to be solved later and only return when, all promises
					// got resolved
					if(promise && promise.then) {
						return promises.push(promise.then(function (value) {
							obj[key] = value;

							next();
						}));
					}

					obj[key] = promise;

					next();
				})
				// only resolve all the promises
				// atached by the invokes/instantiates
				// after the $async.forEach
				// finishes the loop
				.then(function () {
					// resolve all the queued promises
					// atached by the invokes/instantiates
					$q.all(promises).then(function () {
						deferred.resolve(obj);
					});
				});

				return deferred.promise;
			}

			function forEach (obj, iterator, context) {
				var keys, tm;
				var index = 0;
				var deferred = $q.defer();

				if(!iterator) {
					return;
				}

				if(!context) {
					context = {};
				}

				if(isObject(obj)) {
					keys = Object.keys(obj);
				}

				context.next = next;
				context.cancel = cancel;
				deferred.promise.cancel = context.cancel;

				function resolve () {
					disableNext();

					deferred.resolve();
				}

				function cancel () {
					disableNext();

					deferred.reject();
				}

				function disableNext () {
					context.next = function () {
						return;
					};
				}

				function next(i) {
					// if the next index is more or equal to the
					// length of keys
					context.done = (index + 1 >= keys.length);

					// resolve
					if(context.done) {
						resolve();
					}

					if(isDefined(i)) {
						index = i;
					} else {
						index++;
					}

					if(!keys[index]) {
						return;
					}

					var key = keys[index], value = obj[key];

					context.index = index;

					iterator.call(context, value, key, obj);
				}

				next(index);

				return deferred.promise;
			}

			return $async;
		};
	});
'use strict';

var forEach = angular.forEach;
var isDefined = angular.isDefined;
var isObject = angular.isObject;
var isString = angular.isString;
var isFunction = angular.isFunction;

angular.module('ngRouter', [
	'ng',
	'ngRouter.state',
	'ngRouter.view'
]);
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

		  parents.push(state)
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
			var state = getState(stateName);
			var parents = state.getParents();

			all(parents).then(function (resolvedStates) {
				console.log(resolvedStates);
				
				resolvedStates.forEach(function (current) {
					$state.current = current;

					$rootScope.$broadcast('$stateChangeSuccess');
				});
			});
		};

		$state.prepare = prepare;

		// Resolves a bunch of states and return as a promise.
		function all (states) {
			forEach(states, function (stateName, key) {
				if(!isString(stateName)) {
					throw new Error('The state name should be a string.');
				}

				states[key] = prepare(stateName);
			});

			return $q.all(states);
		}

		// Resolves all the dependencies of a state, and return it in a promise.
		function prepare (stateName) {
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

			// resolving each view of the state.
			forEach(nextState.views, function (view, viewName) {
				var viewLocals = locals[viewName] = {};

				// Throw all that we have in the view resolve object into the locals
				// to be resolved and used to the view when everything is ready to use.
				angular.extend(viewLocals, view.resolve);

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

			var current = nextState;
			current.locals = locals;

			// all the state dependencies
			// has been solved, now tell to
			// the views to render
			return $q.all(promises).then(function () {
				return current;
			});
		}

		return $state;
	};
}

angular.module('ngRouter.state', ['ngRouter.async'])
	.provider('$state', $StateProvider);
'use strict';

var STATE_PARAMS_REGEXP = /(?:[\:\{])([A-z]{0,})(?:[\}]|)/g;

function matchParams (url) {
	if(!isString(url)) {
		throw new Error('The url must be a string.');
	}

	return STATE_PARAMS_REGEXP.exec(url);
}	

function $UrlProvider () {
	this.$get = function $UrlFactory () {
	};
}

angular.module('ngRouter.url', [])
	.provider('$url', $UrlProvider)
function $StViewDirective ($state, $animate, $interpolate) {
	return {
		terminal: true,
		priority: 400,
		transclude: 'element',
		restrict: 'EA',
		link: function (scope, element, attrs, ctrl, $transclude) {
			var onloadExp = attrs.onload || '';
			var getViewName = $interpolate(attrs.stView);
			var currentScope;
			var autoScrollExp = attrs.autoscroll;
			var currentElement;
			var previousLeaveAnimation;

			scope.$on('$stateChangeSuccess', update);

			update();

			function cleanupLastView () {
				if(previousLeaveAnimation) {
					$animate.cancel(previousLeaveAnimation);
					previousLeaveAnimation = null;
				}

				if(currentScope) {
					currentScope.$destroy();
					currentScope = null;
				}

				if(currentElement) {
					previousLeaveAnimation = $animate.leave(currentElement);
					previousLeaveAnimation.then(function () {
						previousLeaveAnimation = null;
					});
					currentElement = null;
				}
			}

			function update () {
				var viewName = getViewName(scope);
				var locals = $state.current && $state.current.locals[viewName];
				var $template = locals && locals.$template;

				if(isDefined($template)) {
					var newScope = scope.$new();
					var current = $state.current;

					// Note: This will also link all children of st-view that were contained in the original
          // html. If that content contains controllers, ... they could pollute/change the scope.
          // However, using st-view on an element with additional content does not make sense...
          // Note: We can't remove them in the cloneAttchFn of $transclude as that
          // function is called before linking the content, which would apply child
          // directives to non existing elements.
          var clone = $transclude(newScope, function (clone) {
          	$animate.enter(clone, null, currentElement || element).then(function onStViewEnter() {
          		if(isDefined(autoScrollExp)
          			&& (!autoScrollExp || scope.$eval(autoScrollExp))) {
          			$anchorScroll();
          		}
          	});

          	cleanupLastView();
          });

          currentElement = clone;
          currentScope = newScope;
          currentScope.$emit('$viewContentLoaded');
          currentScope.$eval(onloadExp);
				}
			}
		}
	};
}

function $StViewFillDirective ($compile, $state, $controller, $interpolate) {
	return {
		restrict: 'EA',
		priority: -400,
		link: function (scope, element, attrs) {
			var current = $state.current;
			var getViewName = $interpolate(attrs.stView);
			var viewName = getViewName(scope);
			var locals = current.locals[viewName];

			element.html(locals.$template);

			var link = $compile(element.contents());

			if(locals.$controller) {
				// it is not a function, for the
				// locals are already been resolved
				// at $state
				locals.$scope = scope;

				var controller = $controller(locals.$controller, locals);

				// define the controllerAs syntax if the
				// view has this option
				if(locals.$controllerAs) {
					scope[locals.$controllerAs] = controller;
				}

				element.data('$ngControllerController', controller);
				element.children().data('$ngControllerController', controller);
			}

			link(scope);
		}
	}
}

angular.module('ngRouter.view', [])
	.directive('stView', $StViewDirective)
	.directive('stView', $StViewFillDirective);