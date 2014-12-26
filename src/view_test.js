describe('view', function () {
	var $rootScope, $timeout, $state, $compile, $httpBackend, bodyView;

	beforeEach(module('ngRouter', function ($stateProvider) {
		$stateProvider
			.state('a', {
				url: '/a',
				views: {
					'bodyView': {
						template: '{{ content }}',
						controller: function ($scope) {
							$scope.content = 'Body content!';
						}
					}
				}
			})
			.state('b', {
				url: '/b',
				views: {
					'bodyView': {
						templateUrl: '/my-template.html',
						controller: function ($scope) {
						}
					}
				}
			})
	}));

	beforeEach(inject(function ($injector, $templateCache) {
		$rootScope = $injector.get('$rootScope');
		$httpBackend = $injector.get('$httpBackend');
		$timeout = $injector.get('$timeout');
		$state = $injector.get('$state');
		$compile = $injector.get('$compile');
	}));

	afterEach(function () {
		$timeout.verifyNoPendingTasks();
		$httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
	});

	it('should render the view', function () {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);
		$rootScope.$digest();

		$state.go('a');
		$timeout.flush();
		$rootScope.$digest();

		expect(bodyView[0].querySelector('[st-view="bodyView"] .ng-scope').innerHTML).toBe('Body content!');
	});
});