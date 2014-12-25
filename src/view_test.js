describe('view', function () {
	var $rootScope, $state, body, bodyView;

	beforeEach(module('ngRouter', function ($stateProvider) {
		$stateProvider
			.state('A', {
				url: '/A',
				views: {
					'bodyView': {
						template: 'bodyView content!' +
						'<div st-view="AView1"></div>' +
						'<div st-view="AView2"></div>',
						controller: function ($scope) {
							console.log($scope)
						}
					}
				}
			})
			.state('A.B', {
				url: '/B',
				views: {
					'AView1': {
						template: 'AView1 content!'
					},
					'AView2': {
						template: 'AView2 content!'
					}
				}
			});
	}));

	beforeEach(inject(function ($injector, $compile) {
		$rootScope = $injector.get('$rootScope');
		$state = $injector.get('$state');

		body = angular.element('<div>');

		bodyView = angular.element('<div>');
		bodyView.attr('st-view', 'bodyView');

		body.append(bodyView);

		$compile(body)($rootScope);

		$rootScope.$digest();
	}));

	it('should fill the view', inject(function ($timeout, $q) {
		$state.go('A');
		$rootScope.$digest();

		bodyView = body.children('[st-view*="bodyView"]');
		expect(bodyView.text()).toBe('bodyView content!');

		$state.go('A.B');
		$rootScope.$digest();

		var AView1 = angular.element(bodyView.children('[st-view]')[1]);
		var AView2 = angular.element(bodyView.children('[st-view]')[2]);

		expect(AView1.children('.ng-scope').text()).toBe('AView1 content!');
		expect(AView2.children('.ng-scope').text()).toBe('AView2 content!');
	}));
});