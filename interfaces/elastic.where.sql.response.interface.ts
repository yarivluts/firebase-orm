import { BaseModel } from "../base.model.js";
import { ModelInterface } from "./model.interface.js";
import { ElasticSqlResponse } from "./elastic.sql.response.interface.js";

export interface ElasticWhereSqlResponse {
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

  /**
   * Count the total query result
   */
  count?: Promise<number>;
}