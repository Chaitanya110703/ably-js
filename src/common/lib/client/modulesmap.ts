import { Rest } from './rest';
import { IUntypedCryptoStatic } from '../../types/ICryptoStatic';
import { MsgPack } from 'common/types/msgpack';
import RealtimePresence from './realtimepresence';
import { TransportInitialiser } from '../transport/connectionmanager';
import { IHttp } from 'common/types/http';

export interface ModulesMap {
  Rest?: typeof Rest;
  Crypto?: IUntypedCryptoStatic;
  MsgPack?: MsgPack;
  RealtimePresence?: typeof RealtimePresence;
  WebSocketTransport?: TransportInitialiser;
  XHRPolling?: TransportInitialiser;
  XHRStreaming?: TransportInitialiser;
  XHRRequest?: IHttp;
  FetchRequest?: IHttp;
}

export const allCommonModules: ModulesMap = { Rest };
