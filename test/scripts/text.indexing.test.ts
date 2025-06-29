/**
 * @jest-environment node
 * @description Tests for text indexing functionality
 */

import { Field, BaseModel, Model } from "../../index";

// Test model for text indexing
@Model({
  reference_path: 'text_indexing_test',
  path_id: 'test_id'
})
class TextIndexingTest extends BaseModel {
  @Field({
    is_required: true
  })
  public id!: string;

  @Field({
    is_text_indexing: true
  })
  public textField?: string;

  @Field({
    is_text_indexing: true,
    field_name: 'custom_text_field'
  })
  public customTextField?: string;

  @Field({
    is_required: false
  })
  public normalField?: string;
}

describe('Text Indexing', () => {
  test('should parse text indexing fields correctly', () => {
    const model = new TextIndexingTest();
    
    // Test the parseTextIndexingFields method directly
    const result = model.parseTextIndexingFields('Hello World');
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('hello world');
    expect(result).toContain('~~~hello world~~~');
  });

  test('should create text index when field is set', () => {
    const model = new TextIndexingTest();
    model.id = 'test-id';
    model.textField = 'Hello World';
    
    const data = model.getData();
    
    // Check that original field is preserved
    expect(data.textField).toBe('Hello World');
    
    // Check that text index is created
    expect(data['text_index_textField']).toBeDefined();
    expect(Array.isArray(data['text_index_textField'])).toBe(true);
    expect(data['text_index_textField']).toContain('hello world');
  });

  test('should handle custom field names in text indexing', () => {
    const model = new TextIndexingTest();
    model.id = 'test-id';
    model.customTextField = 'Custom Text';
    
    const data = model.getData();
    
    // Check that original field uses custom name
    expect(data.custom_text_field).toBe('Custom Text');
    expect(data.customTextField).toBeUndefined();
    
    // Check that text index uses custom field name
    expect(data['text_index_custom_text_field']).toBeDefined();
    expect(Array.isArray(data['text_index_custom_text_field'])).toBe(true);
    expect(data['text_index_custom_text_field']).toContain('custom text');
  });

  test('should update text index when field value changes', () => {
    const model = new TextIndexingTest();
    model.id = 'test-id';
    model.textField = 'Initial Text';
    
    let data = model.getData();
    expect(data['text_index_textField']).toContain('initial text');
    
    // Change the value
    model.textField = 'Updated Text';
    
    data = model.getData();
    expect(data['text_index_textField']).toContain('updated text');
    expect(data['text_index_textField']).not.toContain('initial text');
  });

  test('should not create text index for non-text-indexed fields', () => {
    const model = new TextIndexingTest();
    model.id = 'test-id';
    model.normalField = 'Normal Field Value';
    
    const data = model.getData();
    
    // Check that original field is preserved
    expect(data.normalField).toBe('Normal Field Value');
    
    // Check that NO text index is created
    expect(data['text_index_normalField']).toBeUndefined();
  });
});