// Common
import Rest from '../../common/lib/client/rest';
import Realtime from '../../common/lib/client/realtime';
import Platform from '../../common/platform';

// Platform Specific
import BufferUtils from '../web/lib/util/bufferutils';
// @ts-ignore
import Crypto from '../web/lib/util/crypto';
import Http from '../web/lib/util/http';
// @ts-ignore
import Config from './config';
// @ts-ignore
import Transports from '../web/lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
import ConnectionManager from '../../common/lib/transport/connectionmanager';
// @ts-ignore
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from '../web/lib/util/defaults';
import msgpack from '../web/lib/util/msgpack';
import Message from 'common/lib/types/message';
import PresenceMessage from 'common/lib/types/presencemessage';

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

Rest.Crypto = Crypto;
Realtime.Crypto = Crypto;

Rest.Message = Message;
Realtime.Message = Message;

Rest.PresenceMessage = PresenceMessage;
Realtime.PresenceMessage = PresenceMessage;

Realtime.ConnectionManager = ConnectionManager;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  Rest,
  Realtime,
  msgpack,
};
