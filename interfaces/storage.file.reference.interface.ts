
import * as firebase from "firebase/app";
import { OrmUploadTask } from "./upload.task.reference.interface";
/**
 * Represents a reference to a Arbel ORM and Google Cloud Storage object. Developers can
 * upload, download, and delete objects, as well as get/set object metadata.
 */
export interface StorageReference extends firebase.storage.Reference {

  getRef() : firebase.storage.Reference;

  uploadFromUrl(url: string,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;

  uploadFile(data: any,
    metadata?: firebase.storage.UploadMetadata,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;

  uploadString(data: string,
    format?: firebase.storage.StringFormat,
    metadata?: firebase.storage.UploadMetadata,
    onProcessingCallback?: CallableFunction,
    onErrorCallback?: CallableFunction,
    onFinishCallback?: CallableFunction): OrmUploadTask;
}