import { Field, BaseModel, Model, FirestoreOrmRepository } from "../../index";

// Test model to reproduce the text indexing bug
@Model({
  reference_path: 'bug_test',
  path_id: 'bug_test_id'
})
class BugTestModel extends BaseModel {
  @Field({ is_text_indexing: true })
  name: string = '';
  
  @Field({ is_text_indexing: true })
  title: string = '';
}

// Extended test model to access internal methods
class TestableBugModel extends BugTestModel {
  public getDataObject() {
    return this.data;
  }
  
  public setDirectly(fieldName: string, value: any) {
    // Simulate setting a value directly on the data object
    // without going through the setter (which bypasses text indexing)
    this.data[fieldName] = value;
  }
  
  public callRefreshTextIndexing() {
    this.refreshTextIndexing();
  }
}

// Mock Firestore for testing
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn()
};

beforeAll(() => {
  // Initialize mock connection to avoid Firebase dependency
  FirestoreOrmRepository.initGlobalConnection(mockFirestore as any);
});

describe('Text Indexing Bug Reproduction', () => {
  test('should reproduce the issue where field values are not found', () => {
    const model = new TestableBugModel();
    
    // Set values directly in data object (simulating data loading scenario)
    // This bypasses the setter and doesn't create text indices
    model.setDirectly('name', 'Test Name');
    model.setDirectly('title', 'Test Title');
    
    console.log('🔍 DEBUG: Model data after direct setting:', model.getDataObject());
    console.log('🔍 DEBUG: Model.name property:', model.name);
    console.log('🔍 DEBUG: Model.title property:', model.title);
    
    // Check if text indices exist (they shouldn't since we bypassed the setter)
    const dataBeforeRefresh = model.getDataObject();
    expect(dataBeforeRefresh['text_index_name']).toBeUndefined();
    expect(dataBeforeRefresh['text_index_title']).toBeUndefined();
    
    // Call refreshTextIndexing to recreate missing indices
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: Model data after refreshTextIndexing:', model.getDataObject());
    
    // Check if text indices were created - this should work with the fix
    const dataAfterRefresh = model.getDataObject();
    expect(dataAfterRefresh['text_index_name']).toBeDefined();
    expect(Array.isArray(dataAfterRefresh['text_index_name'])).toBe(true);
    expect(dataAfterRefresh['text_index_name']).toContain('test name');
    
    expect(dataAfterRefresh['text_index_title']).toBeDefined();
    expect(Array.isArray(dataAfterRefresh['text_index_title'])).toBe(true);
    expect(dataAfterRefresh['text_index_title']).toContain('test title');
  });
  
  test('should handle the case where values are in model properties but not in data', () => {
    const model = new TestableBugModel();
    
    // Use the normal setters first
    model.name = 'Property Name';
    model.title = 'Property Title';
    
    console.log('🔍 DEBUG: After normal setting - data:', model.getDataObject());
    console.log('🔍 DEBUG: After normal setting - name property:', model.name);
    
    // Now simulate a scenario where the text index gets lost/deleted
    const dataObj = model.getDataObject();
    delete dataObj['text_index_name'];
    delete dataObj['text_index_title'];
    
    console.log('🔍 DEBUG: After deleting text indices:', model.getDataObject());
    
    // Verify text indices are missing
    expect(dataObj['text_index_name']).toBeUndefined();
    expect(dataObj['text_index_title']).toBeUndefined();
    
    // Call refreshTextIndexing - this should recreate them
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: After refreshTextIndexing:', model.getDataObject());
    
    // Check if text indices were recreated
    const finalData = model.getDataObject();
    expect(finalData['text_index_name']).toBeDefined();
    expect(Array.isArray(finalData['text_index_name'])).toBe(true);
    expect(finalData['text_index_name']).toContain('property name');
    
    expect(finalData['text_index_title']).toBeDefined();
    expect(Array.isArray(finalData['text_index_title'])).toBe(true);
    expect(finalData['text_index_title']).toContain('property title');
  });
});