import { Field, BaseModel, Model, FirestoreOrmRepository } from "../../index";

// Test model to verify the fix works
@Model({
  reference_path: 'fix_verification_test',
  path_id: 'fix_verification_test_id'
})
class FixVerificationTestModel extends BaseModel {
  @Field({ is_text_indexing: true })
  name: string = '';
  
  @Field({ is_text_indexing: true })
  title: string = '';
}

// Extended test model to access internal methods WITHOUT overriding refreshTextIndexing
class TestableFixVerificationModel extends FixVerificationTestModel {
  public getDataObject() {
    return this.data;
  }
  
  public callRefreshTextIndexing() {
    // Call the actual fixed method from BaseModel
    this.refreshTextIndexing();
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

describe('Fix Verification - refreshTextIndexing Bug Fix', () => {
  test('should fix the issue where field values are in properties but not in data', () => {
    const model = new TestableFixVerificationModel();
    
    // Set values using normal property assignment first
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
    
    // Now call refreshTextIndexing - this should work with the fix
    console.log('🔍 DEBUG: Calling refreshTextIndexing...');
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: After refreshTextIndexing - data:', model.getDataObject());
    
    // With the fix, this should now pass
    const finalData = model.getDataObject();
    
    expect(finalData['text_index_name']).toBeDefined();
    expect(Array.isArray(finalData['text_index_name'])).toBe(true);
    expect(finalData['text_index_name']).toContain('property name');
    
    expect(finalData['text_index_title']).toBeDefined();
    expect(Array.isArray(finalData['text_index_title'])).toBe(true);
    expect(finalData['text_index_title']).toContain('property title');
  });

  test('should handle field aliases correctly', () => {
    // Create a model with field aliases
    @Model({
      reference_path: 'alias_fix_test',
      path_id: 'alias_fix_test_id'
    })
    class AliasFixTestModel extends BaseModel {
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

    class TestableAliasFixModel extends AliasFixTestModel {
      public getDataObject() {
        return this.data;
      }
      
      public callRefreshTextIndexing() {
        this.refreshTextIndexing();
      }
      
      public setPropertyDirectly(propertyName: string, value: any) {
        Object.defineProperty(this, propertyName, {
          value: value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
      
      public clearData() {
        this.data = {};
      }
    }

    const model = new TestableAliasFixModel();
    
    // Set values normally first
    model.name = 'Initial Name';
    model.title = 'Initial Title';
    
    console.log('🔍 DEBUG: Initial alias model data:', model.getDataObject());
    
    // Clear data
    model.clearData();
    
    // Set properties directly (they now exist on the model but not in data)
    model.setPropertyDirectly('name', 'Aliased Name');
    model.setPropertyDirectly('title', 'Aliased Title');
    
    console.log('🔍 DEBUG: After clearing and setting properties:');
    console.log('🔍 DEBUG: model.name:', model.name);
    console.log('🔍 DEBUG: model.title:', model.title);
    console.log('🔍 DEBUG: model.data:', model.getDataObject());
    
    // Call refreshTextIndexing
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: After refreshTextIndexing with aliases:', model.getDataObject());
    
    // Verify the fix works with aliases
    const finalData = model.getDataObject();
    expect(finalData['text_index_custom_name_field']).toBeDefined();
    expect(Array.isArray(finalData['text_index_custom_name_field'])).toBe(true);
    expect(finalData['text_index_custom_name_field']).toContain('aliased name');
    
    expect(finalData['text_index_custom_title_field']).toBeDefined();
    expect(Array.isArray(finalData['text_index_custom_title_field'])).toBe(true);
    expect(finalData['text_index_custom_title_field']).toContain('aliased title');
  });

  test('should not break existing functionality', () => {
    const model = new TestableFixVerificationModel();
    
    // Normal usage - this should continue to work
    model.name = "Normal Name";
    model.title = "Normal Title";
    
    console.log('🔍 DEBUG: Normal usage data:', model.getDataObject());
    
    // Verify text indices are created automatically
    const normalData = model.getDataObject();
    expect(normalData['text_index_name']).toBeDefined();
    expect(Array.isArray(normalData['text_index_name'])).toBe(true);
    expect(normalData['text_index_name']).toContain('normal name');
    
    expect(normalData['text_index_title']).toBeDefined();
    expect(Array.isArray(normalData['text_index_title'])).toBe(true);
    expect(normalData['text_index_title']).toContain('normal title');
    
    // Clear text indices and call refreshTextIndexing
    delete normalData['text_index_name'];
    delete normalData['text_index_title'];
    
    // This should recreate them using the fix
    model.callRefreshTextIndexing();
    
    console.log('🔍 DEBUG: After refresh normal usage:', model.getDataObject());
    
    // Verify they were recreated
    expect(normalData['text_index_name']).toBeDefined();
    expect(Array.isArray(normalData['text_index_name'])).toBe(true);
    expect(normalData['text_index_name']).toContain('normal name');
    
    expect(normalData['text_index_title']).toBeDefined();
    expect(Array.isArray(normalData['text_index_title'])).toBe(true);
    expect(normalData['text_index_title']).toContain('normal title');
  });
});