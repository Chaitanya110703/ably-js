var Resource = (function() {
	function Resource() {}

	function withAuthDetails(rest, headers, params, errCallback, opCallback) {
		if (Http.supportsAuthHeaders) {
			rest.auth.getAuthHeaders(function(err, authHeaders) {
				if(err)
					errCallback(err);
				else
					opCallback(Utils.mixin(authHeaders, headers), params);
			});
		} else {
			rest.auth.getAuthParams(function(err, authParams) {
				if(err)
					errCallback(err);
				else
					opCallback(headers, Utils.mixin(authParams, params));
			});
		}
	}

	function unenvelope(callback) {
		return function(err, res) {
			if(err) {
				callback(err);
				return;
			}

			var statusCode = res.statusCode,
				response = res.response,
				headers = res.headers;

			if(statusCode < 200 || statusCode >= 300) {
				/* handle wrapped errors */
				var err = response && response.error;
				if(!err) {
					err = new Error(String(res));
					err.statusCode = statusCode;
				}
				callback(err);
				return;
			}

			callback(null, response, headers);
		};
	}

	Resource.get = function(rest, path, origheaders, origparams, envelope, callback) {
		if(envelope) {
			callback = (callback && unenvelope(callback));
			(origparams = (origparams || {}))['envelope'] = 'true';
		}

		function doGet(headers, params) {
			Http.get(rest, path, headers, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, null, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doGet);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doGet);
	};

	Resource.post = function(rest, path, body, origheaders, origparams, envelope, callback) {
		if(envelope) {
			callback = unenvelope(callback);
			origparams['envelope'] = 'true';
		}

		function doPost(headers, params) {
			Http.post(rest, path, headers, body, params, function(err, res, headers) {
				if(err && err.code == 40140) {
					/* token has expired, so get a new one */
					rest.auth.authorise({force:true}, null, function(err) {
						if(err) {
							callback(err);
							return;
						}
						/* retry ... */
						withAuthDetails(rest, origheaders, origparams, callback, doPost);
					});
					return;
				}
				callback(err, res, headers);
			});
		}
		withAuthDetails(rest, origheaders, origparams, callback, doPost);
	};

	return Resource;
})();
