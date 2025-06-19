import { BaseModel } from "../base.model.js";
import { ModelInterface } from "./model.interface.js";

export interface ElasticSqlResponse {
  /**
   * Field name alias
   */
  data: Array<{
    key : string,
    value : any
  }>;

  /**
   * Get the next page
   */
  next?: Promise<ElasticSqlResponse>;

}