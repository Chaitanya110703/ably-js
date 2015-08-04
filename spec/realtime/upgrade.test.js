"use strict";

define(['ably', 'shared_helper'], function(Ably, helper) {
	var exports = {},
		rest,
		publishAtIntervals = function(numMessages, channel, dataFn, onPublish){
			for(var i = numMessages; i > 0; i--) {
				var helper = function(currentMessageNum) {
					console.log('sending: ' + currentMessageNum);
					channel.publish('event0', dataFn(), function(err) {
						console.log('publish callback called');
						onPublish();
					});
				};
				setTimeout(helper(i), 20*i);
			}
		};

	exports.setupUpgrade = function(test) {
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

	exports.setupUpgradeRest = function(test) {
		test.expect(1);
		rest = helper.AblyRest();
		test.ok(true, 'rest client set up');
		test.done();
	};

	/*
	 * Publish once with REST, before upgrade, verify message received
	 */
	exports.publishpreupgrade = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);
			/* connect and attach */
			realtime.connection.on('connected', function() {
				//console.log('publishpreupgrade: connected');
				var testMsg = 'Hello world';
				var rtChannel = realtime.channels.get('publishpreupgrade');
				rtChannel.attach(function(err) {
					if(err) {
						test.ok(false, 'Attach failed with error: ' + helper.displayError(err));
						test.done();
						realtime.close();
						return;
					}

					/* subscribe to event */
					rtChannel.subscribe('event0', function(msg) {
						test.expect(2);
						test.ok(true, 'Received event0');
						test.equal(msg.data, testMsg, 'Unexpected msg text received');
						test.done();
						realtime.close();
					});

					/* publish event */
					var restChannel = rest.channels.get('publishpreupgrade');
					restChannel.publish('event0', testMsg, function(err) {
						if(err) {
							test.ok(false, 'Publish failed with error: ' + helper.displayError(err));
							test.done();
							realtime.close();
						}
					});
				});
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Publish once with REST, after upgrade, verify message received on active transport
	 */
	exports.publishpostupgrade0 = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* subscribe to event */
			var rtChannel = realtime.channels.get('publishpostupgrade0');
			rtChannel.subscribe('event0', function(msg) {
				test.expect(2);
				test.ok(true, 'Received event0');
				test.equal(msg.data, testMsg, 'Unexpected msg text received');
				var closeFn = function() {
					realtime.close();
					test.done();
				};
				if (isBrowser)
					setTimeout(closeFn, 0);
				else
					process.nextTick(closeFn);
			});

			/* publish event */
			var testMsg = 'Hello world';
			var restChannel = rest.channels.get('publishpostupgrade0');
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				//console.log('publishpostupgrade0: transport active: transport = ' + transport);
				if(transport.toString().match(/wss?\:/)) {
					if(rtChannel.state == 'attached') {
						//console.log('*** publishpostupgrade0: publishing (channel attached on transport active) ...');
						restChannel.publish('event0', testMsg, function(err) {
							//console.log('publishpostupgrade0: publish returned err = ' + err);
							if(err) {
								test.ok(false, 'Publish failed with error: ' + err);
								test.done();
								realtime.close();
							}
						});
					} else {
						rtChannel.on('attached', function() {
							//console.log('*** publishpostupgrade0: publishing (channel attached after wait) ...');
							restChannel.publish('event0', testMsg, function(err) {
								//console.log('publishpostupgrade0: publish returned err = ' + err);
								if(err) {
									test.ok(false, 'Publish failed with error: ' + err);
									test.done();
									realtime.close();
								}
							});
						});
					}
				}
			});

			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Publish once with REST, after upgrade, verify message not received on inactive transport
	 */
	exports.publishpostupgrade1 = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* subscribe to event */
			var rtChannel = realtime.channels.get('publishpostupgrade0');
			rtChannel.subscribe('event0', function(msg) {
				test.expect(2);
				test.ok(true, 'Received event0');
				test.equal(msg.data, testMsg, 'Unexpected msg text received');
				var closeFn = function() {
					realtime.close();
					test.done();
				};
				if (isBrowser)
					setTimeout(closeFn, 0);
				else
					process.nextTick(closeFn);
			});

			/* publish event */
			var testMsg = 'Hello world';
			var restChannel = rest.channels.get('publishpostupgrade0');
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().indexOf('/comet/') > -1) {
					/* override the processing of incoming messages on this channel
					 * so we can see if a message arrived.
					 * NOTE: this relies on knowledge of the internal implementation
					 * of the transport */
					transport.onChannelMessage = function(message) {
						if(message.messages)
							test.ok(false, 'Message received on comet transport');
					};
				}
			});
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/)) {
					if(rtChannel.state == 'attached') {
						//console.log('*** publishing (channel attached on transport active) ...');
						restChannel.publish('event0', testMsg);
					} else {
						rtChannel.on('attached', function() {
							//console.log('*** publishing (channel attached after wait) ...');
							restChannel.publish('event0', testMsg);
						});
					}
				}
			});

			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'Channel attach failed with exception: ' + e.stack);
			test.done();
		}
	};

	/**
	 * Publish and subscribe, text protocol
	 */
	exports.upgradepublish0 = function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				test.done();
				realtime.close();
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var transportOpts = {useBinaryProtocol: false};
		var realtime = helper.AblyRealtime(transportOpts);
		test.expect(count);
		var channel = realtime.channels.get('upgradepublish0');
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		});
		var dataFn = function() { return 'Hello world at: ' + new Date() };
		publishAtIntervals(count, channel, dataFn, onPublish);
	};

	/**
	 * Publish and subscribe, binary protocol
	 */
	exports.upgradepublish1 = function(test) {
		var count = 10;
		var cbCount = 10;
		var checkFinish = function() {
			if(count <= 0 && cbCount <= 0) {
				test.done();
				realtime.close();
			}
		};
		var onPublish = function() {
			--cbCount;
			checkFinish();
		};
		var transportOpts = {useBinaryProtocol: true};
		var realtime = helper.AblyRealtime(transportOpts);
		test.expect(count);
		var channel = realtime.channels.get('upgradepublish1');
		/* subscribe to event */
		channel.subscribe('event0', function() {
			test.ok(true, 'Received event0');
			--count;
			checkFinish();
		});
		var dataFn = function() { return 'Hello world at: ' + new Date() };
		publishAtIntervals(count, channel, dataFn, onPublish);
	};

	/*
	 * Base upgrade case
	 */
	exports.upgradebase0 = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(2);
		try {
			var realtime = helper.AblyRealtime(transportOpts);
			/* check that we see the transport we're interested in get activated,
			 * and that we see the comet transport deactivated */
			var failTimer = setTimeout(function() {
				test.ok(false, 'upgrade heartbeat failed (timer expired)');
				test.done();
			}, 120000);

			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.inactive', function(transport) {
				if(transport.toString().indexOf('/comet/') > -1)
					test.ok(true, 'verify comet transport deactivated');
			});
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/)) {
					clearTimeout(failTimer);
					var closeFn = function() {
						realtime.close();
						test.ok(true, 'verify upgrade to ws transport');
						test.done();
					};
					if (isBrowser)
						setTimeout(closeFn, 0);
					else
						process.nextTick(closeFn);
				}
			});

			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check active heartbeat, text protocol
	 */
	exports.upgradeheartbeat0 = function(test) {
		var transportOpts = {useBinaryProtocol: false};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/))
					transport.on('heartbeat', function() {
						transport.off('heartbeat');
						clearTimeout(failTimer);
						test.ok(true, 'verify upgrade heartbeat');
						test.done();
						realtime.close();
					});
				transport.ping();
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check active heartbeat, binary protocol
	 */
	exports.upgradeheartbeat1 = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				if(transport.toString().match(/wss?\:/))
					transport.on('heartbeat', function() {
						transport.off('heartbeat');
						clearTimeout(failTimer);
						test.ok(true, 'verify upgrade heartbeat');
						test.done();
						realtime.close();
					});
				transport.ping();
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, transport + ' connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat does not fire on inactive transport, text protocol
	 */
	exports.upgradeheartbeat2 = function(test) {
		var transportOpts = {useBinaryProtocol: false};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer, cometTransport, wsTransport;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				var transportDescription = transport.toString();
				//console.log('active transport: ' + transportDescription);
				if(transportDescription.indexOf('/comet/') > -1) {
					cometTransport = transport;
					cometTransport.on('heartbeat', function () {
						test.ok(false, 'verify heartbeat does not fire on inactive transport');
						test.done();
						realtime.close();
					});
				}
				if(transportDescription.match(/wss?\:/)) {
					wsTransport = transport;
					wsTransport.on('heartbeat', function () {
						clearTimeout(failTimer);
						/* wait a couple of seconds to give it time
						 * in case it might still fire */
						test.ok(true, 'verify upgrade heartbeat');
						setTimeout(function () {
							test.done();
							realtime.close();
						}, 2000);
					});
					wsTransport.ping();
				}
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, 'connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	/*
	 * Check heartbeat does not fire on inactive transport, binary protocol
	 */
	exports.upgradeheartbeat3 = function(test) {
		var transportOpts = {useBinaryProtocol: true};
		test.expect(1);
		try {
			var realtime = helper.AblyRealtime(transportOpts);

			/* when we see the transport we're interested in get activated,
			 * listen for the heartbeat event */
			var failTimer, cometTransport, wsTransport;
			var connectionManager = realtime.connection.connectionManager;
			connectionManager.on('transport.active', function(transport) {
				var transportDescription = transport.toString();
				//console.log('active transport: ' + transportDescription);
				if(transportDescription.indexOf('/comet/') > -1) {
					cometTransport = transport;
					cometTransport.on('heartbeat', function () {
						test.ok(false, 'verify heartbeat does not fire on inactive transport');
						test.done();
						realtime.close();
					});
				}
				if(transportDescription.match(/wss?\:/)) {
					wsTransport = transport;
					wsTransport.on('heartbeat', function () {
						clearTimeout(failTimer);
						/* wait a couple of seconds to give it time
						 * in case it might still fire */
						test.ok(true, 'verify upgrade heartbeat');
						setTimeout(function() {
							test.done();
							realtime.close();
						}, 2000);
					});
					wsTransport.ping();
				}
			});

			realtime.connection.on('connected', function() {
				failTimer = setTimeout(function() {
					test.ok(false, 'upgrade heartbeat failed (timer expired)');
					test.done();
				}, 120000);
			});
			var exitOnState = function(state) {
				realtime.connection.on(state, function () {
					test.ok(false, 'connection to server failed');
					test.done();
					realtime.close();
				});
			};
			exitOnState('failed');
			exitOnState('suspended');
		} catch(e) {
			test.ok(false, 'upgrade connect with key failed with exception: ' + e.stack);
			test.done();
		}
	};

	return module.exports = exports;
});
