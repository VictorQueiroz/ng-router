'use strict';

var forEach = angular.forEach;
var isString = angular.isString;

angular.module('ngRouter', ['ngRouter.state', 'ngRouter.view']);
'use strict';

function $StateProvider () {
	var states = this.states = {};

	// helper functions
	function splitName (stateName) { // split the name of a state
		return stateName.toString().split(/\./);
	}

	function isParent (stateName) { // check if the state is a parent
		var match = splitName(stateName);

		return match[0] === stateName || match.length === 1; // if the first match is equal to the name of the state, then: it is a self parent state
	}

	function getState (stateName) {
		var state;

		Object.keys(states).forEach(function (key) {
			if(key === stateName) {
				state = states[key];
			}
		});

		return state;
	}

	function getParentName (stateName) {
		var match = splitName(stateName);

		if(isParent(stateName)) {
			return undefined;
		}

		var name = '';

		match.forEach(function (key, index, array) {
		  if(index < array.length - 1) {
		    name += key;
		  }
		  if(index < array.length - 2) {
		    name += '.';
		  }
		});

		return name;
	}

	function getParent (stateName) {
		if(isParent(stateName)) {
			return undefined;
		}
		
		var parentName = getParentName(stateName);

		return getState(parentName);
	}

	function isState (state) {
		return state instanceof State;
	}

	// state entity
	function State (name, options) {
		var state = this;

		this.name = name;

		Object.keys(options).forEach(function (key) {
			if(!angular.isUndefined(options[key])) {
				state[key] = options[key];
			}
		});
	}

	State.prototype.isParent = function () {
		return isParent(this.name);
	};

	State.prototype.getParent = function () {
		return getParent(this.name);
	};

	this.state = function (stateName, options) {
		states[stateName] = new State(stateName, options);

		return this;
	};

	this.$get = function $StateFactory ($rootScope, $view, $q) {
		var $state = {};

		function resolveParents (stateName) {
			var state = getState(stateName);
			var parent = state.getParent();

			if(state.isParent()) {
				return;
			}

			return $state.go(parent.name);
		}

		function resolveState (stateName) {
			var state = getState(stateName);

			resolveParents(stateName);

			return state;
		}

		$state.go = function (to) {
			var state = $state.$current = resolveState(to);

			forEach(state.views, function (view, viewName) {
				$view.load(viewName, view);
			});
		};

		return $state;
	};
}

function $TemplateProvider () {
	this.$get = $TemplateFactory;

	function $TemplateFactory ($templateCache, $http, $q) {
		var $template = {};

		$template.get = function (url) {
			return $q(function (resolve) {
				resolve($templateCache.get(url) || $http.get(url).then(function (response) {
					return response.data;
				}));
			});
		};

		return $template;
	}
}

function $ViewProvider () {
	this.$get = $ViewFactory;

	function $ViewFactory ($rootScope, $template) {
		var $view = {};

		function viewContentLoading (view) {
			$rootScope.$broadcast('$viewContentLoading', view);
		}

		$view.load = function (name, view) {
			if(!view.templateUrl && !view.template) {
				throw new Error('You must have a \'template\' or \'templateUrl\' key on a view definition to load the view content');
			}

			if(view.templateUrl) {
				return $template.get(view.templateUrl).then(function (template) {
					view.$$template = template;

					viewContentLoading(view);
				});
			}

			if(!isString(view.template)) {
				throw new Error('The \'template\' option must be a string');
			}

			view.$$template = view.template;

			viewContentLoading(view);
		};

		return $view;
	}
}

angular.module('ngRouter.state', [])
	.provider('$template', $TemplateProvider)
	.provider('$state', $StateProvider)
	.provider('$view', $ViewProvider);
'use strict';

var CONTROLLER_AS_REGEXP = /([A-z]{0,})(?:[\ \w])(as)(?:[\ \w])([A-z]{0,})/;

angular.module('ngRouter.view', [])
	.directive('ngView', function ($rootScope, $state, $interpolate, $compile, $controller, $injector, $q) {
		return {

			compile: function (element, attrs) {
				var viewName, newScope, newState, locals, promises;

				return function postLink (scope, element, attrs) {
					$rootScope.$on('$viewContentLoading', function (event, view) {
						updateView(view);
					});

					var getViewName = $interpolate(attrs.ngView || attrs.name);

					function updateView (view) {
						newState = $state.$current;
						viewName = getViewName(scope);
						newScope = scope.$new();
						promises = [];
						locals = {};

						if(!newState.views[viewName]) {
							return;
						}

						if(view.resolve) {
							angular.extend(locals, view.resolve);
						}

						if(view.controller) {
							var match;

							if(isString(view.controller) && (match = view.controller.match(CONTROLLER_AS_REGEXP)) && match.length >= 3) {
								view.controller = match[0];
								view.controllerAs = match[2];
							}

							locals.$scope = function () {
								return newScope;
							};

							forEach(locals, function (fn, key) {
							  var promise = $injector.invoke(fn, {}, locals);

							  if(promise.then) {
							    return promises.push(promise.then(function (value) {
							      locals[key] = value;
							      
							      return value;
							    }));
							  }
							  
							  locals[key] = promise;
							});

							$q.all(promises).then(function (v) {
								var controller = $controller(view.controller, locals);

								if(view.controllerAs) {
									scope[view.controllerAs] = controller;
								}
							});
						}

						element.html(view.$$template);

						var link = $compile(element.contents());

						link(newScope);
					}
				}
			}
		};
	});