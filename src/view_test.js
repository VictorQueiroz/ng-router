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
							$scope.inputValue = 'That is my value!';
						}
					}
				}
			})
	}));

	beforeEach(inject(function ($injector) {
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

		$rootScope.$apply(function () {
			$state.go('a');
		});

		expect(bodyView[0].querySelector('[st-view="bodyView"] .ng-scope').innerHTML).toBe('Body content!');
	});

	it('shoud render $templateCache templates', inject(function ($templateCache) {
		bodyView = $compile('<div><div st-view="bodyView"></div></div>')($rootScope);

		var template = '<div>' +
			'<input value="{{ inputValue }}" id="my-input">' +
			'<div ng-include src="\'/my-other-template.html\'" id="my-other-template"></div>'
		'</div>';

		$templateCache.put('/my-template.html', template);
		$templateCache.put('/my-other-template.html', 'Bitch!');

		$rootScope.$apply(function () {
			$state.go('b');
		});

		expect($state.current.name).toBe('b');
		expect(bodyView[0].querySelector('#my-input').value).toBe('That is my value!');
		expect(bodyView[0].querySelector('#my-other-template .ng-scope').innerHTML).toBe('Bitch!');
	}));
});