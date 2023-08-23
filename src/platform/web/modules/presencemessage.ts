import * as API from '../../../../ably';
import { fromEncoded, fromEncodedArray } from '../../../common/lib/types/presencemessage';

// The type assertions for the decode* functions below are due to https://github.com/ably/ably-js/issues/1421

export const decodePresenceMessage = ((obj, options) => {
  return fromEncoded(obj, options);
}) as API.Types.PresenceMessageStatic['fromEncoded'];

export const decodePresenceMessages = ((obj, options) => {
  return fromEncodedArray(obj, options);
}) as API.Types.PresenceMessageStatic['fromEncodedArray'];
