export interface BindSqlInterface {
    /**
     * Reference path - for example accounts/:account_id/websites
     */
    query: string;
    /**
     * Path Id - unique code for model id inside the refernce path - for example account_id
     */
    bind : { key : string}
  }