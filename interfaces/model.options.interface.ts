export interface ModelOptions {
  /**
   * Reference path - for example accounts/:account_id/websites
   */
  reference_path: string;
  /**
   * Path Id - unique code for model id inside the reference path - for example account_id
   * If not provided and auto_path_id is enabled globally, it will be generated from the class name
   */
  path_id?: string;
  /**
   * 
   */
  auto_time?: boolean;
  /**
   * Static Id - static id that represent singleton object
   */
  static_id?: string
}