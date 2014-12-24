describe('state', function () {
	var bodyView, $rootScope, $state;

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
						controller: AppController,
						resolve: {
							users: function ($q, $timeout) {
								return $q(function (resolve) {
									$timeout(function() {
										resolve([{
											id: 1,
											name: 'Victor Queiroz'
										}]);
									}, 2000);
								});
							}
						}
					}
				}
			});
	}));

	beforeEach(inject(function ($injector, $compile) {
		$state = $injector.get('$state');
		$rootScope = $injector.get('$rootScope');

		bodyView = angular.element('<div>');
		bodyView.attr('st-view', 'bodyView');

		bodyView = $compile(bodyView)($rootScope);
	}));

	afterEach(inject(function ($q, $timeout) {
		$timeout.flush()
	}))

	it('should change the state', function () {
		$state.go('A');

		$rootScope.$digest();

		expect($state.current.name).toBe('A');
	});
});