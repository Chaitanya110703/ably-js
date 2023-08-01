// Common
import BaseClient from '../../common/lib/client/baseclient';
import { DefaultRest } from '../../common/lib/client/defaultrest';
import { DefaultRealtime } from '../../common/lib/client/defaultrealtime';
import Platform from '../../common/platform';

// Platform Specific
import BufferUtils from '../web/lib/util/bufferutils';
// @ts-ignore
import { createCryptoClass } from '../web/lib/util/crypto';
import Http from '../web/lib/util/http';
// @ts-ignore
import Config from './config';
// @ts-ignore
import Transports from '../web/lib/transport';
import Logger from '../../common/lib/util/logger';
import { getDefaults } from '../../common/lib/util/defaults';
// @ts-ignore
import WebStorage from './lib/util/webstorage';
import PlatformDefaults from '../web/lib/util/defaults';
import msgpack from '../web/lib/util/msgpack';

const Crypto = createCryptoClass(Config, BufferUtils);

Platform.Crypto = Crypto;
Platform.BufferUtils = BufferUtils;
Platform.Http = Http;
Platform.Config = Config;
Platform.Transports = Transports;
Platform.WebStorage = WebStorage;

BaseClient.Crypto = Crypto;

Logger.initLogHandlers();

Platform.Defaults = getDefaults(PlatformDefaults);

if (Platform.Config.agent) {
  // @ts-ignore
  Platform.Defaults.agent += ' ' + Platform.Config.agent;
}

export default {
  Rest: DefaultRest,
  Realtime: DefaultRealtime,
  msgpack,
};
