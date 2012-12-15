var ConnectionManager = (function() {

	var noop = function() {};

	var states = {
		initialized:  {state: 'initialized',  terminal: false, queueEvents: true,  sendEvents: false},
		connecting:   {state: 'connecting',   terminal: false, queueEvents: true,  sendEvents: false, retryDelay: Defaults.connectTimeout, failState: 'disconnected'},
		connected:    {state: 'connected',    terminal: false, queueEvents: false, sendEvents: true, failState: 'disconnected'},
		disconnected: {state: 'disconnected', terminal: false, queueEvents: true,  sendEvents: false, retryDelay: Defaults.disconnectTimeout},
		suspended:    {state: 'suspended',    terminal: false, queueEvents: false, sendEvents: false, retryDelay: Defaults.suspendedTimeout},
		closed:       {state: 'closed',       terminal: false, queueEvents: false, sendEvents: false},
		failed:       {state: 'failed',       terminal: true,  queueEvents: false, sendEvents: false}
	};

	/* public constructor */
	function ConnectionManager(realtime, options) {
		EventEmitter.call(this);
		this.realtime = realtime;
		this.options = options;
		this.pendingMessages = [];
		this.state = states.initialized;
		this.error = null;
		options.transports = options.transports || Defaults.transports;
		var transports = this.transports = [];
		for(var i = 0; i < options.transports.length; i++) {
			if(options.transports[i] in ConnectionManager.availableTransports)
				transports.push(options.transports[i]);
		}
		Logger.logAction(Logger.LOG_MINOR, 'Realtime.ConnectionManager()', 'started');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'requested transports = [' + options.transports + ']');
		Logger.logAction(Logger.LOG_MICRO, 'Realtime.ConnectionManager()', 'available transports = [' + transports + ']');

		if(!transports.length) {
			var msg = 'no requested transports available';
			Logger.logAction(Logger.LOG_ERROR, 'realtime.ConnectionManager()', msg);
			throw new Error(msg);
		}

		/* generic state change handling */
		var self = this;
    	this.on(function(newState, transport) {
    		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager on(connection state)', 'newState = ' + newState.current);
    		switch(newState.current) {
    		case 'connected':
    			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager on(connected)', 'connected; transport = ' + transport);
    			/* set up handler for events received on this transport */
    			transport.on('channelmessage', function(msg) {
    				var channelName = msg.channel;
    				if(!channelName) {
    					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager on(channelmessage)', 'received event unspecified channel: ' + channelName);
    					return;
    				}
    				var channel = realtime.channels.attached[channelName];
    				if(!channel) {
    					Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager on(channelmessage)', 'received event for non-existent channel: ' + channelName);
    					return;
    				}
    				channel.onMessage(msg);
    			});
    			/* re-attach any previously attached channels
    			 * FIXME: is this conditional on us being connected with the same connectionId ? */
    			var attached = realtime.channels.attached;
        		for(var channelName in attached)
    				attached[channelName].attachImpl();
    			break;
    		case 'suspended':
    		case 'closed':
    		case 'failed':
            	var connectionState = self.state;
        		for(var channelName in attached)
    				attached[channelName].setSuspended(connectionState);
        		break;
    		default:
    		}
    	});

	}
	Utils.inherits(ConnectionManager, EventEmitter);

	/*********************
	 * transport management
	 *********************/

	ConnectionManager.availableTransports = {};

	ConnectionManager.prototype.chooseTransport = function(callback) {
		if(this.transport) {
			callback(this.transport);
			return;
		}
		var self = this;
		var candidateTransports = this.transports.slice();
		var tryFirstCandidate = function(tryCb) {
			var candidate = candidateTransports.shift();
			if(!candidate) {
				tryCb(null);
				return;
			}
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransport()', 'trying ' + candidate);
			(ConnectionManager.availableTransports[candidate]).tryConnect(self, self.realtime.auth, self.options, function(err, transport) {
				if(err) {
					tryFirstCandidate(tryCb);
					return;
				}
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.chooseTransport()', 'transport ' + candidate + ' connecting');
				self.setupTransport(transport);
				tryCb(transport);
			});
		};

		tryFirstCandidate(callback);
	};

	ConnectionManager.prototype.setupTransport = function(transport) {
		var self = this;
		this.transport = transport;

		var handleStateEvent = function(state) {
			return function(error, connectionId) {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setupTransport; on state = ' + state);
				if(error && error.reason)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setupTransport; reason =  ' + error.reason);
				if(connectionId)
					Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.setupTransport; connectionId =  ' + connectionId);
				if(self.transport === transport) {
					if(connectionId)
						self.realtime.connection.id = connectionId;
					self.notifyState({state:state, error:error});
				}
			};
		};
		var states = ['connected', 'disconnected', 'closed', 'failed'];
		for(var i = 0; i < states.length; i++) {
			var state = states[i];
			transport.on(state, handleStateEvent(state));
		}
	};

	/*********************
	 * state management
	 *********************/

	ConnectionManager.activeState = function(state) {
		return state.queueEvents || state.sendEvents;
	};

	ConnectionManager.prototype.enactStateChange = function(stateChange) {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.enactStateChange', 'setting new state: ' + stateChange.current);
		this.state = states[stateChange.current];
		if(this.state.terminal)
			this.error = stateChange.error;
		this.emit(stateChange.current, stateChange, this.transport);
	};

	/****************************************
	 * ConnectionManager connection lifecycle
	 ****************************************/

	ConnectionManager.prototype.startConnectTimer = function() {
		var self = this;
		this.connectTimer = setTimeout(function() {
			if(self.connectTimer) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager connect timer expired', 'requesting new state: ' + states.connecting.failState);
				self.notifyState({state: states.connecting.failState});
			}
		}, Defaults.connectTimeout);
	};

	ConnectionManager.prototype.cancelConnectTimer = function() {
		if(this.connectTimer) {
			clearTimeout(this.connectTimer);
			this.connectTimer = undefined;
		}
	};

	ConnectionManager.prototype.startSuspendTimer = function() {
		var self = this;
		if(this.suspendTimer)
			return;
		this.suspendTimer = setTimeout(function() {
			if(self.suspendTimer) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager suspend timer expired', 'requesting new state: suspended');
				states.connecting.failState = 'suspended';
				states.connecting.queueEvents = false;
				self.notifyState({state: 'suspended'});
			}
		}, Defaults.suspendedTimeout);
	};

	ConnectionManager.prototype.cancelSuspendTimer = function() {
		states.connecting.failState = 'disconnected';
		states.connecting.queueEvents = true;
		if(this.suspendTimer) {
			clearTimeout(this.suspendTimer);
			delete this.suspendTimer;
		}
	};

	ConnectionManager.prototype.startRetryTimer = function(interval) {
		var self = this;
		this.retryTimer = setTimeout(function() {
			Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager retry timer expired', 'retrying');
			self.requestState({state: 'connecting'});
		}, interval);
	};

	ConnectionManager.prototype.cancelRetryTimer = function() {
		if(this.retryTimer) {
			clearTimeout(this.retryTimer);
			delete this.retryTimer;
		}
	};

	ConnectionManager.prototype.notifyState = function(indicated) {
		/* do nothing if we're already in the indicated state
		 * or we're unable to move from the current state*/
		if(this.state.terminal || indicated.state == this.state.state)
			return; /* silently do nothing */

		/* if we consider the transport to have failed
		 * (perhaps temporarily) then remove it, so we
		 * can re-select when we re-attempt connection */
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'new state: ' + indicated.state);
		var newState = states[indicated.state];
		if(!newState.sendEvents) {
			if(this.transport) {
				Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.notifyState()', 'deleting transport ' + this.transport);
				this.transport.dispose();
				delete this.transport;
			}
		}

		/* kill running timers, including suspend if connected */
		this.cancelConnectTimer();
		this.cancelRetryTimer();
		if(indicated.state == 'connected') {
			this.cancelSuspendTimer();
		}

		/* set up retry and suspended timers */
		var change = new ConnectionStateChange(this.state.state, newState.state, newState.retryDelay, (indicated.error || ConnectionError[newState.state]));
		if(newState.retryDelay)
			this.startRetryTimer(newState.retryDelay);

		/* implement the change and notify */
		this.enactStateChange(change);
		if(this.state.sendEvents)
			this.sendPendingMessages();
	};

	ConnectionManager.prototype.requestState = function(request) {
		/* kill running timers, as this request supersedes them */
		this.cancelConnectTimer();
		this.cancelRetryTimer();
		if(request.state == this.state.state)
			return; /* silently do nothing */
		if(this.state.terminal)
			throw new Error(this.error.reason);
		if(request.state == 'connecting') {
			if(this.state.state == 'connected')
				return; /* silently do nothing */
			this.connectImpl();
		} else if(request.state == 'failed') {
			if(this.transport) {
				this.transport.abort(request.reason);
				delete this.transport;
			}
		} else if(request.state = 'closed') {
			if(this.transport) {
				this.transport.close();
				delete this.transport;
				this.cancelConnectTimer();
				this.cancelRetryTimer();
				this.cancelSuspendTimer();
			}
		}
		var newState = states[request.state];
		var change = new ConnectionStateChange(this.state.state, newState.state, newState.retryIn, (request.error || ConnectionError[newState.state]));
		this.enactStateChange(change);
	};

	ConnectionManager.prototype.connectImpl = function() {
		Logger.logAction(Logger.LOG_MINOR, 'ConnectionManager.connectImpl()', 'starting connection');
		this.startSuspendTimer();
		this.startConnectTimer();

		var self = this;
		var auth = this.realtime.auth;
		var connectErr = function(err) {
			Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.connectImpl()', err);
			if(err.statusCode == 401 && err.message.indexOf('expire') != -1 && auth.method == 'token') {
				/* re-get a token */
				auth.getToken(true, function(err) {
					if(err) {
						connectErr(err);
						return;
					}
					self.connectImpl();
				});
			}
			/* FIXME: decide if fatal */
			var fatal = false;
			if(fatal)
				self.notifyState({state: 'failed', error: err});
			else
				self.notifyState({state: states.connecting.failState, error: err});
		};

		var tryConnect = function() {
			self.chooseTransport(function(transport) {
				if(!transport) {
					var err = new Error('Unable to connect using any available transport');
					connectErr(err);
					return;
				}
				/* nothing to do .. as transport connection is initiated
				 * in chooseTransport() */
			});
		};

		if(auth.method == 'basic') {
			tryConnect();
		} else {
			auth.getToken(false, function(err) {
				if(err)
					connectErr(err);
				else
					tryConnect();
			});
		}
	};

	/******************
	 * event queueing
	 ******************/

	ConnectionManager.prototype.send = function(msg, queueEvents, callback) {
		callback = callback || noop;
		if(this.state.queueEvents) {
			if(queueEvents) {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'queueing event');
				var lastPending = this.pendingMessages[this.pendingMessages.length - 1];
				if(lastPending && RealtimeChannel.mergeTo(lastPending.msg, msg)) {
					if(!lastPending.isMerged) {
						lastPending.callback = new Multicaster([lastPending.callback]);
						lastPending.isMerged = true;
					}
					lastPending.listener.push(callback);
				} else {
					this.pendingMessages.push({msg: msg, callback: callback});
				}
			} else {
				Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'rejecting event');
				callback(this.error);
			}
		}
		if(this.state.sendEvents) {
			Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.send()', 'sending event');
			this.transport.send(msg, callback);
		}
	};

	ConnectionManager.prototype.sendPendingMessages = function() {
		Logger.logAction(Logger.LOG_MICRO, 'ConnectionManager.sendPendingMessages()', 'sending ' + this.pendingMessages.length + ' queued messages');
		var pending = this.pendingMessages.shift();
		if(pending) {
			try {
				this.transport.send(pending.msg, pending.callback);
			} catch(e) {
				Logger.logAction(Logger.LOG_ERROR, 'ConnectionManager.sendPendingMessages()', 'Unexpected exception in transport.send(): ' + e);
			}
		}
	};

	return ConnectionManager;
})();
