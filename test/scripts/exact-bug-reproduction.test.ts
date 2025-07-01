import { Field, BaseModel, Model, FirestoreOrmRepository } from "../../index";

// Test model to reproduce the specific bug from the issue description
@Model({
  reference_path: 'exact_bug_test',
  path_id: 'exact_bug_test_id'
})
class ExactBugTestModel extends BaseModel {
  @Field({ is_text_indexing: true })
  name: string = '';
  
  @Field({ is_text_indexing: true })
  title: string = '';
}

// Extended test model to access internal methods and override behavior
class TestableExactBugModel extends ExactBugTestModel {
  public getDataObject() {
    return this.data;
  }
  
  public callRefreshTextIndexing() {
    this.refreshTextIndexing();
  }

  public getTextIndexingFields() {
    const prototype = Object.getPrototypeOf(this);
    return prototype.textIndexingFields;
  }

  // Override the refreshTextIndexing method to add debugging
  refreshTextIndexing(): void {
    const modelPrototype = Object.getPrototypeOf(this);
    console.log('🔍 DEBUG: modelPrototype.textIndexingFields:', modelPrototype.textIndexingFields);

    // Get text indexing fields from the prototype
    if (modelPrototype && modelPrototype.textIndexingFields) {
      for (const fieldKey in modelPrototype.textIndexingFields) {
        if (modelPrototype.textIndexingFields.hasOwnProperty(fieldKey)) {
          const fieldName = this.getFieldName(fieldKey);
          const textIndexFieldName = 'text_index_' + fieldName;
          const fieldValue = this.data[fieldName];
          
          console.log(`🔍 DEBUG: Processing field ${fieldKey} -> ${fieldName}`);
          console.log(`🔍 DEBUG: fieldValue from this.data[${fieldName}]:`, fieldValue);
          console.log(`🔍 DEBUG: fieldValue from this[${fieldKey}]:`, this[fieldKey]);
          console.log(`🔍 DEBUG: fieldValue from this[${this.getAliasName(fieldName)}]:`, this[this.getAliasName(fieldName)]);
          console.log(`🔍 DEBUG: Checking text index field ${textIndexFieldName}:`, this.data[textIndexFieldName]);

          // If field has value but text index is missing or empty, recreate it
          if (fieldValue && (!this.data[textIndexFieldName] || !Array.isArray(this.data[textIndexFieldName]))) {
            console.log(`🔍 DEBUG: Creating text index for ${fieldName} with value:`, fieldValue);
            this.data[textIndexFieldName] = this.parseTextIndexingFields(fieldValue + '');
          } else {
            console.log(`🔍 DEBUG: Skipping text index creation for ${fieldName}:`, {
              hasFieldValue: !!fieldValue,
              hasTextIndex: !!this.data[textIndexFieldName],
              isArray: Array.isArray(this.data[textIndexFieldName])
            });
          }
        }
      }
    }
  }

  // Method to set a value on the property without triggering the setter
  public setPropertyDirectly(propertyName: string, value: any) {
    // This simulates a scenario where the property is set directly
    // without going through the Field decorator's setter
    Object.defineProperty(this, propertyName, {
      value: value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  // Method to clear data object completely
  public clearData() {
    this.data = {};
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

describe('Exact Bug Reproduction - Issue from GitHub', () => {
  test('should reproduce the exact scenario from the issue description', () => {
    const model = new TestableExactBugModel();
    
    // Set values using normal property assignment (this should work)
    model.name = "Test Name";
    model.title = "Test Title";
    
    console.log('🔍 DEBUG: After normal assignment - data:', model.getDataObject());
    
    // Clear the data object to simulate a scenario where data is lost
    model.clearData();
    
    // Now set the properties directly (simulating the scenario where values exist on properties but not in data)
    model.setPropertyDirectly('name', 'Property Name');
    model.setPropertyDirectly('title', 'Property Title');
    
    console.log('🔍 DEBUG: After setting properties directly:');
    console.log('🔍 DEBUG: model.name:', model.name);
    console.log('🔍 DEBUG: model.title:', model.title);
    console.log('🔍 DEBUG: model.data:', model.getDataObject());
    
    // Now call refreshTextIndexing - this should demonstrate the bug
    console.log('🔍 DEBUG: Calling refreshTextIndexing...');
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: After refreshTextIndexing - data:', model.getDataObject());
    
    // With the current implementation, this should fail because refreshTextIndexing
    // only looks in this.data[fieldName], but the values are in the properties
    const finalData = model.getDataObject();
    
    // The test should pass if the bug is fixed
    expect(finalData['text_index_name']).toBeDefined();
    expect(Array.isArray(finalData['text_index_name'])).toBe(true);
    expect(finalData['text_index_name']).toContain('property name');
    
    expect(finalData['text_index_title']).toBeDefined();
    expect(Array.isArray(finalData['text_index_title'])).toBe(true);
    expect(finalData['text_index_title']).toContain('property title');
  });

  test('should handle the exact example from the issue', () => {
    // This recreates the exact example from the issue description
    const model = new ExactBugTestModel();
    model.name = "Test Name";
    model.title = "Test Title";
    
    // Clear text indices to simulate the bug scenario
    const data = (model as any).data;
    delete data['text_index_name'];
    delete data['text_index_title'];
    
    console.log('📄 DEBUG: Data before refreshTextIndexing:', data);
    console.log('📄 DEBUG: model.name:', model.name);
    console.log('📄 DEBUG: model.title:', model.title);
    
    // Call refreshTextIndexing as mentioned in the issue
    model.refreshTextIndexing();
    
    console.log('📄 DEBUG: Data after refreshTextIndexing:', data);
    
    // This should work because the values are in this.data
    expect(data['text_index_name']).toBeDefined();
    expect(Array.isArray(data['text_index_name'])).toBe(true);
    expect(data['text_index_name']).toContain('test name');
    
    expect(data['text_index_title']).toBeDefined();
    expect(Array.isArray(data['text_index_title'])).toBe(true);
    expect(data['text_index_title']).toContain('test title');
  });
});