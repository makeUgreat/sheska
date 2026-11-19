import { type CallContext } from '@core/call-context';
import { type AttachmentImageMediaType } from './attachment-image.codec';

export interface AttachmentContentStore {
  put(path: string, data: Uint8Array, mediaType: AttachmentImageMediaType, context: CallContext): Promise<void>;
}
