describe('state', function () {
	var bodyView, $rootScope, $state, $timeout, $compile;

	beforeEach(module('ngRouter.state', function ($stateProvider) {
		$stateProvider
			.state('a', {
				url: '/a',
				views: {
					'bodyView': {
						template: 'App content!' +
						'<div st-view="appView"></div>',
						controllerAs: 'appCtrl',
						controller: function AppController ($scope) {
							this.someObject = {
								'keyOne': 'valueOne',
								'keyTwo': 'valueTwo',
								'keyThree': 'valueThree'
							};
						}
					}
				}
			})
			.state('a.b', {
				url: '/b',
				views: {
					'appView': {
						template: 'App view content! {{ appCtrl.someObject }}'
					}
				}
			});
	}));

	beforeEach(inject(function ($injector) {
		$compile = $injector.get('$compile');
		$state = $injector.get('$state');
		$rootScope = $injector.get('$rootScope');
		$timeout = $injector.get('$timeout');
	}));

	afterEach(function () {
		$timeout.verifyNoPendingTasks();
	});

	it('should change the state', inject(function () {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		$state.go('a');
		$timeout.flush();
		$rootScope.$digest();

		expect($state.current.name).toBe('a');
	}));

	it('should resolve all the existent parent states before reach to the desired state', function () {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		expect(bodyView[0].querySelector('[st-view]').innerHTML).toBe('');

		$rootScope.$apply(function () {
			$state.go('a.b');
		});

		console.log(bodyView)
	});
});