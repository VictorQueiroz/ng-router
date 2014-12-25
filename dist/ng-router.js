'use strict';

angular.module('ngRouter.async', [])
	.provider('$async', function $AsyncProvider () {
		this.$get = function $AsyncFactory ($q, $injector) {
			var $async = {};

			$async.forEach = forEach;

			$async.resolve = resolve;

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

angular.module('ngRouter.state', ['ngRouter.async'])
	.provider('$state', $StateProvider);
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
				var template = locals && locals.$template;

				if(isDefined(template)) {
					var newScope = scope.$new();
					var current = $state.current;

					// Note: This will also link all children of ng-view that were contained in the original
          // html. If that content contains controllers, ... they could pollute/change the scope.
          // However, using ng-view on an element with additional content does not make sense...
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

			if(current.controller) {
				// it is not a function, for the
				// locals are already been resolved
				// at $state
				locals.$scope = scope;

				var controller = $controller(current.controller, locals);

				// define the controllerAs syntax if the
				// view has this option
				if(current.controllerAs) {
					scope[current.controllerAs] = controller;
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