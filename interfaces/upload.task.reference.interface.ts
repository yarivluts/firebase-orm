  
  import * as firebase from "firebase/app";
  
  /**
   * Represents a reference to a Arbel ORM and Google Cloud Storage object. Developers can
   * upload, download, and delete objects, as well as get/set object metadata.
   */
  export interface OrmUploadTask extends firebase.storage.UploadTask {
 
  }