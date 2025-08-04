import { BaseModel, Model, Field } from "../../index";

/**
 * Basic test model for simple tests
 */
@Model({
  reference_path: 'test_models',
  path_id: 'test_id'
})
export class TestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public requiredField!: string;

  @Field({
    is_required: false,
  })
  public optionalField?: string;

  @Field({
    is_required: true,
    field_name: 'custom_field_name'
  })
  public customNameField!: string;

  @Field({
    is_text_indexing: true
  })
  public indexedField?: string;
}

/**
 * Test model for CRUD operations
 */
@Model({
  reference_path: 'crud_test',
  path_id: 'crud_test_id'
})
export class CrudTestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public title!: string;

  @Field({
    is_required: false,
  })
  public description?: string;

  @Field({
    is_required: false,
    field_name: 'created_date'
  })
  public createdDate?: string;

  @Field({
    is_required: false,
  })
  public isActive?: boolean;
}

/**
 * Test model for querying
 */
@Model({
  reference_path: 'test_items',
  path_id: 'item_id'
})
export class TestItem extends BaseModel {
  @Field({
    is_required: true,
    is_text_indexing: true
  })
  public name!: string;

  @Field({
    is_required: false
  })
  public category?: string;

  @Field({
    is_required: false
  })
  public price?: number;

  @Field({
    is_required: false
  })
  public tags?: string[];
}

/**
 * Test model for storage operations
 */
@Model({
  reference_path: 'storage_test',
  path_id: 'storage_test_id'
})
export class StorageTestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
    field_name: 'image_url'
  })
  public imageUrl?: string;

  @Field({
    is_required: false,
    field_name: 'document_url'
  })
  public documentUrl?: string;
}

/**
 * Test model for realtime operations
 */
@Model({
  reference_path: 'realtime_test',
  path_id: 'realtime_test_id'
})
export class RealtimeTestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public status?: string;

  @Field({
    is_required: false,
  })
  public count?: number;
}

/**
 * Test model for path parameter functionality
 */
@Model({
  reference_path: 'users/:userId/posts/:postId/comments',
  path_id: 'comment_id'
})
export class PathParamTestModel extends BaseModel {
  userId?: string;
  postId?: string;

  @Field({
    is_required: true,
  })
  public content!: string;

  @Field({
    is_required: false,
  })
  public author?: string;
}