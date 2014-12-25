describe('state', function () {
	var bodyView, $rootScope, $state, $timeout;

	var appTemplate = 'App content!' +
	'<div st-view="appView"></div>';

	function AppController ($scope) {}

	beforeEach(module('ngRouter.state', function ($stateProvider) {
		$stateProvider
			.state('A', {
				url: '/A',
				views: {
					'bodyView': {
						template: appTemplate,
						controller: AppController
					}
				}
			});
	}));

	beforeEach(inject(function ($injector, $compile) {
		$state = $injector.get('$state');
		$rootScope = $injector.get('$rootScope');
		$timeout = $injector.get('$timeout');

		bodyView = angular.element('<div>');
		bodyView.attr('st-view', 'bodyView');

		bodyView = $compile(bodyView)($rootScope);
	}));

	afterEach(function () {
		$timeout.verifyNoPendingTasks();
	});

	it('should change the state', inject(function () {
		$state.go('A');
		$timeout.flush();
		$rootScope.$digest();

		expect($state.current.name).toBe('A');
	}));
});