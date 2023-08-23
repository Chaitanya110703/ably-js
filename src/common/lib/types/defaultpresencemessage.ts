import * as API from '../../../../ably';
import PresenceMessage, { fromEncoded, fromEncodedArray } from './presencemessage';

/**
 `DefaultPresenceMessage` is the class returned by `DefaultRest` and `DefaultRealtime`’s `PresenceMessage` static property. It introduces the static methods described in the `PresenceMessageStatic` interface of the public API of the non tree-shakable version of the library.
 */
export class DefaultPresenceMessage extends PresenceMessage {
  static async fromEncoded(encoded: unknown, inputOptions?: API.Types.ChannelOptions): Promise<PresenceMessage> {
    return fromEncoded(encoded, inputOptions);
  }

  static async fromEncodedArray(
    encodedArray: Array<unknown>,
    options?: API.Types.ChannelOptions
  ): Promise<PresenceMessage[]> {
    return fromEncodedArray(encodedArray, options);
  }
}
