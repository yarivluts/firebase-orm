import { 
  HasOneOptions, 
  BelongsToOptions, 
  HasManyOptions, 
  BelongsToManyOptions 
} from "../interfaces/relationship.options.interface";

/**
 * Decorator for one-to-one relationship where this model has a foreign key pointing to another model
 */
export function BelongsTo(options: BelongsToOptions): any {
  return (target: any, key: string) => {
    if (!target.relationships) {
      target.relationships = {};
    }
    target.relationships[key] = {
      type: 'belongsTo',
      ...options
    };
  };
}

/**
 * Decorator for one-to-one relationship where another model has a foreign key pointing to this model
 */
export function HasOne(options: HasOneOptions): any {
  return (target: any, key: string) => {
    if (!target.relationships) {
      target.relationships = {};
    }
    target.relationships[key] = {
      type: 'hasOne',
      ...options
    };
  };
}

/**
 * Decorator for one-to-many relationship where another model has a foreign key pointing to this model
 */
export function HasMany(options: HasManyOptions): any {
  return (target: any, key: string) => {
    if (!target.relationships) {
      target.relationships = {};
    }
    target.relationships[key] = {
      type: 'hasMany',
      ...options
    };
  };
}

/**
 * Decorator for many-to-many relationship through a junction table
 */
export function BelongsToMany(options: BelongsToManyOptions): any {
  return (target: any, key: string) => {
    if (!target.relationships) {
      target.relationships = {};
    }
    target.relationships[key] = {
      type: 'belongsToMany',
      ...options
    };
  };
}