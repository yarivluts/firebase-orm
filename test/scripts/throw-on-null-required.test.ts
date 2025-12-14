import { FirestoreOrmRepository, Field, BaseModel, Model } from "../../index";

describe('Throw on Null Required Fields Configuration', () => {
  beforeEach(() => {
    // Reset global config before each test
    FirestoreOrmRepository.setGlobalConfig({
      auto_lower_case_field_name: false,
      auto_path_id: false,
      throw_on_required_field_null: false
    });
    // Clear registered path_ids before each test
    FirestoreOrmRepository.clearRegisteredPathIds();
  });

  test('should log error when throw_on_required_field_null is disabled (default behavior)', () => {
    // Ensure the option is disabled
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: false
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField!: string;

      @Field({ is_required: false })
      public optionalField?: string;
    }

    const model = new TestModel();
    
    // Mock console.error to capture the error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Should return false and log error, not throw
    const result = model.verifyRequiredFields();
    
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain("Can't save requiredField with null!");
    
    consoleErrorSpy.mockRestore();
  });

  test('should throw exception when throw_on_required_field_null is enabled and required field is null', () => {
    // Enable the throw option
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField!: string;

      @Field({ is_required: false })
      public optionalField?: string;
    }

    const model = new TestModel();
    
    // Should throw an error
    expect(() => {
      model.verifyRequiredFields();
    }).toThrow(/Can't save requiredField with null!/);
  });

  test('should not throw exception when all required fields have values', () => {
    // Enable the throw option
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField!: string;

      @Field({ is_required: false })
      public optionalField?: string;
    }

    const model = new TestModel();
    model.requiredField = 'value';
    
    // Should not throw an error
    expect(() => {
      const result = model.verifyRequiredFields();
      expect(result).toBe(true);
    }).not.toThrow();
  });

  test('should throw exception for multiple required fields when throw_on_required_field_null is enabled', () => {
    // Enable the throw option
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField1!: string;

      @Field({ is_required: true })
      public requiredField2!: number;

      @Field({ is_required: false })
      public optionalField?: string;
    }

    const model = new TestModel();
    
    // Should throw an error listing all missing required fields
    expect(() => {
      model.verifyRequiredFields();
    }).toThrow(/Can't save requiredField1, requiredField2 with null!/);
  });

  test('should allow null values in optional fields when throw_on_required_field_null is enabled', () => {
    // Enable the throw option
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField!: string;

      @Field({ is_required: false })
      public optionalField?: string;
    }

    const model = new TestModel();
    model.requiredField = 'value';
    // optionalField is null/undefined - this should be fine
    
    // Should not throw an error
    expect(() => {
      const result = model.verifyRequiredFields();
      expect(result).toBe(true);
    }).not.toThrow();
  });

  test('should throw exception when save() is called with null required fields and option is enabled', async () => {
    // Enable the throw option
    FirestoreOrmRepository.setGlobalConfig({
      throw_on_required_field_null: true
    });

    @Model({
      reference_path: 'test_models',
      path_id: 'test_id'
    })
    class TestModel extends BaseModel {
      @Field({ is_required: true })
      public requiredField!: string;
    }

    const model = new TestModel();
    
    // save() calls verifyRequiredFields(), so it should throw
    await expect(async () => {
      await model.save();
    }).rejects.toThrow(/Can't save requiredField with null!/);
  });
});
