import { Field, BaseModel, Model, BelongsTo, HasMany } from "../../index";

@Model({
  reference_path: 'simple_models',
  path_id: 'simple_id'
})
class SimpleModel extends BaseModel {
  @Field({ is_required: true })
  public name!: string;
}

describe('Relationship Decorators Basic Functionality', () => {
  test('should have relationship loading methods available on BaseModel', () => {
    const model = new SimpleModel();

    // Check that the new relationship methods exist
    expect(typeof model.loadHasMany).toBe('function');
    expect(typeof model.loadHasOne).toBe('function');
    expect(typeof model.loadBelongsTo).toBe('function');
    expect(typeof model.loadBelongsToMany).toBe('function');
    expect(typeof model.loadWithRelationships).toBe('function');
  });

  test('should maintain backward compatibility with legacy methods', () => {
    const model = new SimpleModel();

    // Check that legacy methods still exist
    expect(typeof model.getOneRel).toBe('function');
    expect(typeof model.getManyRel).toBe('function');
  });

  test('should have relationship decorators available for import', () => {
    // Check that decorators are imported and are functions
    expect(typeof BelongsTo).toBe('function');
    expect(typeof HasMany).toBe('function');
  });
});