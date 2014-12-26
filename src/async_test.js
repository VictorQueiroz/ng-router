describe('async', function () {
	var $rootScope, $async, $timeout, obj, promise, index;

	beforeEach(module('ngRouter.async'));

	beforeEach(inject(function ($injector) {
		$async = $injector.get('$async');
		$timeout = $injector.get('$timeout');
		$rootScope = $injector.get('$rootScope');

		obj = {
			'key1': 'value',
			'key2': 'value',
			'key3': 'value'
		};
	}));

	afterEach(inject(function ($timeout, $httpBackend) {
		$timeout.verifyNoPendingTasks();
		$httpBackend.verifyNoOutstandingExpectation();
		$httpBackend.verifyNoOutstandingRequest();
	}));

	it('should loop', inject(function ($timeout) {
		promise = $async.forEach(obj, function (value, key) {
			index = this.index;

			expect(obj[key]).toBeDefined();
			expect(obj[key]).toBe(value);

			this.next();
		});
	}));

	it('should be a promise', function () {
		promise = $async.forEach(obj, function (value, key) {
			index = this.index;

			expect(obj[key]).toBeDefined();
			expect(obj[key]).toBe(value);

			this.next();
		});

		expect(promise.then).toBeDefined();
		expect(promise.catch).toBeDefined();
	});

	it('should reach to the last object', function () {
		promise = $async.forEach(obj, function (value, key) {
			index = this.index;

			expect(obj[key]).toBeDefined();
			expect(obj[key]).toBe(value);

			this.next();
		});
		
		expect(index).toBe(2);
	});

	it('should have a cancellation trigger', inject(function ($rootScope, $timeout) {
		var canceled = false;
		var done = false;

		promise = $async.forEach(obj, function () {
			index = this.index;
			
			if(this.index === 1) {
				this.cancel();
			}

			this.next();
		})

		promise.then(function () {
			done = true;
		}, function () {
			canceled = true;
		});

		$timeout.flush();
		$rootScope.$digest();

		expect(index).toBe(1);
		expect(canceled && !done).toBe(true);
	}));

	it('should resolve dependencies', inject(function ($rootScope, $httpBackend, $timeout) {
		// resolved variables
		var $scope, $template, $promise;

		var template = '<div>That is a template!</div>';

		$httpBackend.whenGET('/template.html').respond(template);

		var resolve = {
			$scope: function ($rootScope) {
				return $rootScope.$new();
			},

			$promise: function ($q) {
				return $q(function (resolve) {
					resolve(1);
				});
			},

			$template: function ($http) {
				return $http.get('/template.html').then(function (res) {
					return res.data;
				});
			}
		};

		promise = $async.resolve(resolve);

		promise.then(function (resolved) {
			$scope = resolved.$scope;
			$template = resolved.$template;
			$promise = resolve.$promise;
		})

		$timeout.flush();
		$httpBackend.flush();
		$timeout.flush();
		$rootScope.$apply();

		expect($promise).toBe(1);
		expect($scope).toBeDefined();
		expect($template).toBe(template);
	}));

	it('should resolve self deferred injections', inject(function ($httpBackend, $rootScope, $compile) {
		var parent = '<div></div>';
		var templateOne = '<div>That is a template!</div>';
		var templateTwo = '<div>This is the second template!</div>';
		var templateThree = '<div>' +
			'One more <b>{{ badWord }}</b> template.' +
		'</div>';

		$httpBackend.whenGET('/parent.html').respond(parent);
		$httpBackend.whenGET('/template-one.html').respond(templateOne);
		$httpBackend.whenGET('/template-two.html').respond(templateTwo);
		$httpBackend.whenGET('/template-three.html').respond(templateThree);

		// resolved variables
		var $templateOne, $templateTwo, $templateThree, $scope, template, parent;

		var resolve = {
			$templateOne: function ($http) {
				return $http.get('/template-one.html').then(function (r) {
					return r.data;
				});
			},

			$templateTwo: function ($http) {
				return $http.get('/template-two.html').then(function (r) {
					return r.data;
				});
			},

			$templateThree: function ($http) {
				return $http.get('/template-three.html').then(function (r) {
					return r.data;
				});
			},

			$parent: function ($http) {
				return $http.get('/parent.html').then(function (r) {
					return r.data;
				});
			},

			$scope: function ($rootScope) {
				var scope = $rootScope.$new();

				scope.badWord = 'fucking';

				return scope;
			},

			parent: function ($templateOne, $parent, $templateTwo, $templateThree) {
				var parent = angular.element('<div>');

				parent.append($parent);
				parent.append($templateOne).append($templateTwo).append($templateThree);

				return parent;
			},

			template: function ($compile, $scope, parent) {
				return $compile(parent)($scope);
			}
		};

		promise = $async.resolve(resolve);

		promise.then(function (r) {
			$scope = r.$scope;
			template = r.template;
			parent = r.parent;
		});

		$timeout.flush();
		$httpBackend.flush();
		$timeout.flush();
		$rootScope.$digest();

		expect(template).toBe($compile(parent)($scope));
	}));

	it('should resolve strings as services', function () {
		var rootScopeAlias, resolved;

		promise = $async.resolve({
			'rootScopeAlias': '$rootScope',
			'controllerAlias': '$controller',
			promise: function ($q, $timeout) {
				return $q(function (resolve) {
					$timeout(function () {
						$timeout(function () {
							resolve(obj);
						});
					});
				})
			}
		}).then(function (r) {
			rootScopeAlias = r.rootScopeAlias;
			resolved = r.promise;
		})

		$timeout.flush();
		$rootScope.$digest();

		expect(rootScopeAlias).toBe($rootScope);
		expect(rootScopeAlias.$eval('1 + 2')).toBe(3);
		expect(resolved).toBe(obj);
	});
});