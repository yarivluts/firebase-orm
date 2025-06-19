
import { OrmUploadTask } from "./upload.task.reference.interface";

import type { StringFormat, UploadMetadata, StorageReference as OriginStorageReference } from "firebase/storage";
/**
 * Represents a reference to a Arbel ORM and Google Cloud Storage object. Developers can
 * upload, download, and delete objects, as well as get/set object metadata.
 */
export interface StorageReference extends OriginStorageReference {

  getRef(): OriginStorageReference;

  uploadFromUrl(url: string,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;

  uploadFile(data: any,
    metadata?: UploadMetadata,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;

  uploadString(data: string,
    format?: StringFormat,
    metadata?: UploadMetadata,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;
}