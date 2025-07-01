import { Field, BaseModel, Model, FirestoreOrmRepository } from "../../index";

// Test model with text indexing
@Model({
  reference_path: 'text_index_test',
  path_id: 'text_index_test_id'
})
class TextIndexTestModel extends BaseModel {
  @Field({
    is_required: true
  })
  public name!: string;

  @Field({
    is_required: false,
    is_text_indexing: true
  })
  public title?: string;
}

// Extended test model to access protected members for testing
class TestableTextIndexModel extends TextIndexTestModel {
  public clearTextIndex(fieldName: string) {
    delete this.data['text_index_' + fieldName];
  }
  
  public getStoredFields() {
    return this['storedFields'];
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

// Test to reproduce the issue
describe('Text Indexing storedFields Bug', () => {
  test('should include text index fields in storedFields after refreshTextIndexing', () => {
    // Create model and set text field
    const model = new TestableTextIndexModel();
    model.name = 'Test Model';
    model.title = 'Test Title';
    
    // Check initial state - text index should be created automatically
    const initialData = model.getData();
    console.log('Initial storedFields:', model.getStoredFields());
    console.log('Initial data keys:', Object.keys(initialData));
    
    // Check if text index field exists in data
    expect(initialData['text_index_title']).toBeDefined();
    expect(Array.isArray(initialData['text_index_title'])).toBe(true);
    expect(initialData['text_index_title']).toContain('test title');
    
    // Now clear the text index and call refreshTextIndexing
    model.clearTextIndex('title');
    
    // Verify text index is missing
    const dataAfterClear = model.getData();
    expect(dataAfterClear['text_index_title']).toBeUndefined();
    
    // Call refreshTextIndexing to recreate the index
    model.refreshTextIndexing();
    
    // Check if text index field is now included in getData output
    const dataAfterRefresh = model.getData();
    console.log('After refresh storedFields:', model.getStoredFields());
    console.log('After refresh data keys:', Object.keys(dataAfterRefresh));
    
    // This should now pass with the fix
    expect(dataAfterRefresh['text_index_title']).toBeDefined();
    expect(Array.isArray(dataAfterRefresh['text_index_title'])).toBe(true);
    expect(dataAfterRefresh['text_index_title']).toContain('test title');
  });
});