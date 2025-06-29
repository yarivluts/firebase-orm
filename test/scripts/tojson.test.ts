/**
 * Simple test file to verify toJSON functionality
 * @jest-environment node
 */

import { BaseModel } from '../../base.model'; 
import { Field, Model } from '../../index';
import { FirestoreOrmRepository } from '../../repository';

// Mock the Firebase connection
jest.mock('../../repository', () => ({
  FirestoreOrmRepository: {
    DEFAULT_KEY_NAME: 'default',
    getGlobalConnection: jest.fn(() => ({
      getFirestore: jest.fn()
    }))
  }
}));

// Create a simple test model for this specific test
@Model({
  reference_path: 'test_models',
  path_id: 'test_id'
})
class SimpleTestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public requiredField!: string;

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

describe('toJSON Test', () => {
  test('toJSON should serialize model with alias names', () => {
    const model = new SimpleTestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    model.indexedField = 'indexed';
    
    const jsonResult = model.toJSON();
    
    // With getData(true), should use alias names
    expect(jsonResult).toHaveProperty('requiredField', 'test value');
    expect(jsonResult).toHaveProperty('custom_field_name', 'custom field');
    expect(jsonResult).toHaveProperty('indexedField', 'indexed');
  });

  test('getData without alias should use property names', () => {
    const model = new SimpleTestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    model.indexedField = 'indexed';
    
    const data = model.getData(false);
    
    // Without alias, should use property names  
    expect(data).toHaveProperty('requiredField', 'test value');
    expect(data).toHaveProperty('customNameField', 'custom field');
    expect(data).toHaveProperty('indexedField', 'indexed');
  });

  test('getData with alias should use field names', () => {
    const model = new SimpleTestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    model.indexedField = 'indexed';
    
    const data = model.getData(true);
    
    // With alias, should use field names
    expect(data).toHaveProperty('requiredField', 'test value');
    expect(data).toHaveProperty('custom_field_name', 'custom field');
    expect(data).toHaveProperty('indexedField', 'indexed');
  });
});