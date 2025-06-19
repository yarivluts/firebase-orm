import { BaseModel } from "../base.model";
import { ModelInterface } from "./model.interface";

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