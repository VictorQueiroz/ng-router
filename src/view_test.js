describe('view', function () {
	var $rootScope, bodyView;

	beforeEach(module('ngRouter', function ($stateProvider) {
		$stateProvider
			.state('A', {
				url: '/A',
				views: {
					'bodyView': {
						template: 'bodyView content!',
						controller: function ($scope) {
							console.log($scope)
						}
					}
				}
			});
	}));

	beforeEach(inject(function ($injector, $compile) {
		$rootScope = $injector.get('$rootScope');

		bodyView = angular.element('<div>');
		bodyView.attr('st-view', 'bodyView');

		bodyView = $compile(bodyView)($rootScope);

		$rootScope.$digest();
	}));

	it('should do something', inject(function () {
		
	}));
});