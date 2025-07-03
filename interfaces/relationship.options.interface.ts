export interface RelationshipOptions {
  /**
   * The model class this relationship points to
   */
  model: { new(): any };

  /**
   * The local field name that stores the foreign key (for belongsTo relationships)
   */
  localKey?: string;

  /**
   * The foreign field name that stores the reference (for hasMany relationships)
   */
  foreignKey?: string;

  /**
   * For many-to-many relationships, the junction table model
   */
  through?: { new(): any };

  /**
   * The field in the junction table that references this model
   */
  thisKey?: string;

  /**
   * The field in the junction table that references the target model
   */
  otherKey?: string;
}

export interface HasOneOptions extends RelationshipOptions {
  /**
   * The foreign field name that stores the reference to this model
   */
  foreignKey: string;
}

export interface BelongsToOptions extends RelationshipOptions {
  /**
   * The local field name that stores the foreign key
   */
  localKey: string;
}

export interface HasManyOptions extends RelationshipOptions {
  /**
   * The foreign field name that stores the reference to this model
   */
  foreignKey: string;
}

export interface BelongsToManyOptions extends RelationshipOptions {
  /**
   * The junction table model
   */
  through: { new(): any };

  /**
   * The field in the junction table that references this model
   */
  thisKey: string;

  /**
   * The field in the junction table that references the target model
   */
  otherKey: string;
}