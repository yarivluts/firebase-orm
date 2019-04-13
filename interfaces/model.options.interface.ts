export interface ModelOptions {
    /**
     * Reference path - for example accounts/:account_id/websites
     */
    reference_path: string;
    /**
     * Path Id - unique code for model id inside the refernce path - for example account_id
     */
    path_id : string
  }