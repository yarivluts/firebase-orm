/**
 * Manual verification test
 */

import { BaseModel } from '../../base.model'; 
import { Field, Model } from '../../index';

// Mock the Firebase connection
jest.mock('../../repository', () => ({
  FirestoreOrmRepository: {
    DEFAULT_KEY_NAME: 'default',
    getGlobalConnection: jest.fn(() => ({
      getFirestore: jest.fn()
    }))
  }
}));

@Model({
  reference_path: 'test_models',
  path_id: 'test_id'
})
class TestModel extends BaseModel {
  @Field({
    is_required: true,
  })
  public requiredField!: string;

  @Field({
    is_required: true,
    field_name: 'custom_field_name'
  })
  public customNameField!: string;
}

describe('Current Behavior Test', () => {
  test('Check what toString actually produces', () => {
    const model = new TestModel();
    model.requiredField = 'test value';
    model.customNameField = 'custom field';
    
    const toStringResult = model.toString();
    console.log('toString result:', toStringResult);
    
    const parsed = JSON.parse(toStringResult);
    console.log('parsed toString:', parsed);
    
    const toJSONResult = model.toJSON();
    console.log('toJSON result:', toJSONResult);
  });
});