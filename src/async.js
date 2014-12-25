'use strict';

angular.module('ngRouter.async', [])
	.provider('$async', function $AsyncProvider () {
		this.$get = function $AsyncFactory ($q, $injector) {
			var $async = {};

			$async.forEach = forEach;

			$async.resolve = resolve;

			// resolves an object with dependencies
			// invoke each key value with $injector
			// solves all the promises queued and then
			// resolve the resolve function promise
			function resolve (obj, locals) {
				var promises = [];
				var deferred = $q.defer();

				if(!locals) {
					locals = {};
				}

				forEach(obj, function (value, key) {
					var done = this.done;
					var next = this.next;
					var promise = isString(value) ? $injector.get(value) : $injector.invoke(value, {}, obj);

					// if is a promise, add it to the promises variable
					// to be solved later and only return when, all promises
					// got resolved
					if(promise && promise.then) {
						return promises.push(promise.then(function (value) {
							obj[key] = value;

							next();
						}));
					}

					obj[key] = promise;

					next();
				})
				// only resolve all the promises
				// atached by the invokes/instantiates
				// after the $async.forEach
				// finishes the loop
				.then(function () {
					// resolve all the queued promises
					// atached by the invokes/instantiates
					$q.all(promises).then(function () {
						deferred.resolve(obj);
					});
				});

				return deferred.promise;
			}

			function forEach (obj, iterator, context) {
				var keys, tm;
				var index = 0;
				var deferred = $q.defer();

				if(!iterator) {
					return;
				}

				if(!context) {
					context = {};
				}

				if(isObject(obj)) {
					keys = Object.keys(obj);
				}

				context.next = next;
				context.cancel = cancel;
				deferred.promise.cancel = context.cancel;

				function resolve () {
					disableNext();

					deferred.resolve();
				}

				function cancel () {
					disableNext();

					deferred.reject();
				}

				function disableNext () {
					context.next = function () {
						return;
					};
				}

				function next(i) {
					// if the next index is more or equal to the
					// length of keys
					context.done = (index + 1 >= keys.length);

					// resolve
					if(context.done) {
						resolve();
					}

					if(isDefined(i)) {
						index = i;
					} else {
						index++;
					}

					if(!keys[index]) {
						return;
					}

					var key = keys[index], value = obj[key];

					context.index = index;

					iterator.call(context, value, key, obj);
				}

				next(index);

				return deferred.promise;
			}

			return $async;
		};
	});