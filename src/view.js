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