describe('state', function () {
	var bodyView, $rootScope, $state, $timeout, $compile, $httpBackend;

	beforeEach(module('ngRouter.state', function ($stateProvider) {
		$stateProvider
			.state('a', {
				url: '/a',
				views: {
					'bodyView': {
						template: 'App content!' +
						'<div st-view="appView"></div>',
					}
				}
			})
			.state('a.b', {
				url: '/b',
				views: {
					'appView': {
						template: 'App view content!' +
						'<div st-view="bview1"></div>'
					}
				}
			})
			.state('a.b.c', {
				url: '/c',
				views: {
					'bview1': {
						templateUrl: '/template.html'
					}
				}
			})
			.state('a.b.d', {
				url: '/{param}/{paramTwo}',
				views: {
					'bview1': {
						template: 'My template!'
					}
				}
			})
			.state('d', {
				url: '/{id}',
				views: {
					'bodyView': {
						template: '<div id="state-params-id">{{ id }}</div>',
						controller: function ($stateParams, $scope) {
							$scope.id = $stateParams.id;
							console.log($stateParams)
						}
					}
				}
			});
	}));

	beforeEach(inject(function ($injector) {
		$compile = $injector.get('$compile');
		$state = $injector.get('$state');
		$httpBackend = $injector.get('$httpBackend');
		$rootScope = $injector.get('$rootScope');
		$timeout = $injector.get('$timeout');
	}));

	afterEach(function () {
		$timeout.verifyNoPendingTasks();
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	});

	it('should change the state', inject(function () {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		$state.go('a');
		$timeout.flush();
		$rootScope.$digest();

		expect($state.current.name).toBe('a');
	}));

	it('should store templates at $templateCache after use once', inject(function ($templateCache) {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		var template = '<div>' +
		'My template!' +
		'</div>';

		$httpBackend.whenGET('/template.html').respond(template);

		$state.go('a.b.c');
		$httpBackend.flush();
		$timeout.flush();
		$rootScope.$digest();

		expect($templateCache.get('/template.html')).toBe(template);
	}));

	it('should change the $location.path according to the params', inject(function ($location) {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		$state.go('a.b.d', {
			param: 100,
			paramTwo: 2
		});
		$timeout.flush();
		$rootScope.$digest();

		expect($location.path()).toBe('/a/b/100/2');
	}));

	it('should be able to get $stateParamsProvider', inject(function ($location) {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		$state.go('d', { id: 1 });
		$timeout.flush();
		$rootScope.$digest();
	}));
});