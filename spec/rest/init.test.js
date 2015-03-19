"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {};

	exports.setupInit = function(test) {
		test.expect(1);
		helper.setupApp(function(err) {
			if(err) {
				test.ok(false, helper.displayError(err));
			} else {
				test.ok(true, 'app set up');
			}
			test.done();
		});
	};

	/* init with key string */
	exports.init_key_string = function(test) {
		test.expect(1);
		try {
			var keyStr = helper.getTestApp().key0Str,
				rest = new helper.Ably.Rest(keyStr);

			test.equal(rest.options.key, keyStr);
			test.done();
		} catch(e) {
			test.ok(false, 'Init with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/* init with token string */
	exports.init_token_string = function(test) {
		test.expect(1);
		try {
			/* first generate a token ... */
			var rest = helper.AblyRest(),
				key1Id = helper.getTestApp().appId + '.' + helper.getTestApp().key1Id,
				testKeyOpts = { keyId: key1Id, keyValue: helper.getTestApp().key1Value };

			rest.auth.requestToken(testKeyOpts, null, function(err, tokenDetails) {
				if(err) {
					test.ok(false, helper.displayError(err));
					test.done();
					return;
				}

				var tokenStr = tokenDetails.id,
					rest = new helper.Ably.Rest(tokenStr);

				test.equal(rest.options.authToken, tokenStr);
				test.done();
			});
		} catch(e) {
			test.ok(false, 'Init with token failed with exception: ' + e.stack);
			test.done();
		}
	};

	return module.exports = helper.withTimeout(exports);
});
