import { IPlatformConfig } from './types/IPlatformConfig';
import { IHttp } from './types/http';
import ConnectionManager from './lib/transport/connectionmanager';
import IDefaults from './types/IDefaults';
import IWebStorage from './types/IWebStorage';
import IBufferUtils from './types/IBufferUtils';
import Transport from './lib/transport/transport';

export default class Platform {
  static Config: IPlatformConfig;
  static BufferUtils: IBufferUtils;
  static Crypto: any; //Not typed
  static Http: typeof IHttp;
  static Transports: Array<(connectionManager: typeof ConnectionManager) => Transport>;
  static Defaults: IDefaults;
  static WebStorage: IWebStorage | null;
}
