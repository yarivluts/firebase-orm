import { Field, BaseModel, Model, FirestoreOrmRepository } from "../../index";

// Test model to reproduce the actual text indexing bug
@Model({
  reference_path: 'actual_bug_test',
  path_id: 'actual_bug_test_id'
})
class ActualBugTestModel extends BaseModel {
  @Field({ is_text_indexing: true })
  name: string = '';
  
  @Field({ is_text_indexing: true })
  title: string = '';
}

// Extended test model to access internal methods and simulate the issue
class TestableActualBugModel extends ActualBugTestModel {
  public getDataObject() {
    return this.data;
  }
  
  public simulateDataLoad(fieldName: string, value: any) {
    // This simulates how data might be loaded from Firestore
    // directly into the data object, bypassing the property setters
    this.data[fieldName] = value;
  }
  
  public callRefreshTextIndexing() {
    this.refreshTextIndexing();
  }

  public getTextIndexingFields() {
    const prototype = Object.getPrototypeOf(this);
    return prototype.textIndexingFields;
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

describe('Actual Text Indexing Bug - refreshTextIndexing issue', () => {
  test('should reproduce the bug where refreshTextIndexing cannot find field values', () => {
    const model = new TestableActualBugModel();
    
    console.log('🔍 DEBUG: textIndexingFields from prototype:', model.getTextIndexingFields());
    
    // Simulate loading data from Firestore directly into the data object
    // This bypasses the property setters completely
    model.simulateDataLoad('name', 'Loaded Name');
    model.simulateDataLoad('title', 'Loaded Title');
    
    console.log('🔍 DEBUG: Data object after simulation:', model.getDataObject());
    console.log('🔍 DEBUG: model.name (through getter):', model.name);
    console.log('🔍 DEBUG: model.title (through getter):', model.title);
    
    // Clear any accidental text indices that might have been created
    const dataObj = model.getDataObject();
    delete dataObj['text_index_name'];
    delete dataObj['text_index_title'];
    
    console.log('🔍 DEBUG: Data after clearing text indices:', model.getDataObject());
    
    // Verify no text indices exist
    expect(dataObj['text_index_name']).toBeUndefined();
    expect(dataObj['text_index_title']).toBeUndefined();
    
    // Now call refreshTextIndexing - this is where the bug occurs
    // The current implementation only looks in this.data[fieldName]
    // But the values are in this.data[fieldName] (which is correct)
    // However, let's test a scenario where this doesn't work
    
    console.log('🔍 DEBUG: About to call refreshTextIndexing...');
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: Data after refreshTextIndexing:', model.getDataObject());
    
    // Check if text indices were created
    const finalData = model.getDataObject();
    expect(finalData['text_index_name']).toBeDefined();
    expect(Array.isArray(finalData['text_index_name'])).toBe(true);
    expect(finalData['text_index_name']).toContain('loaded name');
    
    expect(finalData['text_index_title']).toBeDefined();
    expect(Array.isArray(finalData['text_index_title'])).toBe(true);
    expect(finalData['text_index_title']).toContain('loaded title');
  });

  test('should reproduce the bug with field aliases', () => {
    // Create a model with field aliases to test the scenario mentioned in the issue
    @Model({
      reference_path: 'alias_bug_test',
      path_id: 'alias_bug_test_id'
    })
    class AliasBugTestModel extends BaseModel {
      @Field({ 
        is_text_indexing: true,
        field_name: 'custom_name_field'
      })
      name: string = '';
      
      @Field({ 
        is_text_indexing: true,
        field_name: 'custom_title_field'
      })
      title: string = '';
    }

    class TestableAliasBugModel extends AliasBugTestModel {
      public getDataObject() {
        return this.data;
      }
      
      public simulateDataLoad(fieldName: string, value: any) {
        this.data[fieldName] = value;
      }
      
      public callRefreshTextIndexing() {
        this.refreshTextIndexing();
      }

      public getTextIndexingFields() {
        const prototype = Object.getPrototypeOf(this);
        return prototype.textIndexingFields;
      }
    }

    const model = new TestableAliasBugModel();
    
    console.log('🔍 DEBUG: textIndexingFields for alias model:', model.getTextIndexingFields());
    
    // Simulate data being loaded with the custom field names
    model.simulateDataLoad('custom_name_field', 'Aliased Name');
    model.simulateDataLoad('custom_title_field', 'Aliased Title');
    
    console.log('🔍 DEBUG: Data with aliases:', model.getDataObject());
    console.log('🔍 DEBUG: model.name (should work through alias):', model.name);
    console.log('🔍 DEBUG: model.title (should work through alias):', model.title);
    
    // Clear text indices
    const dataObj = model.getDataObject();
    delete dataObj['text_index_custom_name_field'];
    delete dataObj['text_index_custom_title_field'];
    
    console.log('🔍 DEBUG: Data after clearing text indices:', model.getDataObject());
    
    // Call refreshTextIndexing
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: Data after refreshTextIndexing with aliases:', model.getDataObject());
    
    // Check if text indices were created with proper field names
    const finalData = model.getDataObject();
    expect(finalData['text_index_custom_name_field']).toBeDefined();
    expect(Array.isArray(finalData['text_index_custom_name_field'])).toBe(true);
    expect(finalData['text_index_custom_name_field']).toContain('aliased name');
    
    expect(finalData['text_index_custom_title_field']).toBeDefined();
    expect(Array.isArray(finalData['text_index_custom_title_field'])).toBe(true);
    expect(finalData['text_index_custom_title_field']).toContain('aliased title');
  });
});