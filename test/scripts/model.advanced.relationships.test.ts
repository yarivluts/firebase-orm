import * as firebase from "firebase";
import 'firebase/storage';
import { 
  FirestoreOrmRepository, 
  Field, 
  BaseModel, 
  Model, 
  BelongsTo, 
  HasOne, 
  HasMany, 
  BelongsToMany 
} from "../../index";
import { config } from "../config";

// User model
@Model({
  reference_path: 'users',
  path_id: 'user_id'
})
class User extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public email?: string;

  // One-to-one: User has one profile
  @HasOne({
    model: UserProfile,
    foreignKey: 'user_id'
  })
  public profile?: UserProfile;

  // One-to-many: User has many posts
  @HasMany({
    model: Post,
    foreignKey: 'author_id'
  })
  public posts?: Post[];

  // Many-to-many: User belongs to many roles through user_roles
  @BelongsToMany({
    model: Role,
    through: UserRole,
    thisKey: 'user_id',
    otherKey: 'role_id'
  })
  public roles?: Role[];
}

// UserProfile model (one-to-one with User)
@Model({
  reference_path: 'user_profiles',
  path_id: 'profile_id'
})
class UserProfile extends BaseModel {
  @Field({
    is_required: true,
    field_name: 'user_id'
  })
  public userId!: string;

  @Field({
    is_required: false,
  })
  public bio?: string;

  @Field({
    is_required: false,
  })
  public avatar?: string;

  // Belongs to one user
  @BelongsTo({
    model: User,
    localKey: 'userId'
  })
  public user?: User;
}

// Post model (many-to-one with User)
@Model({
  reference_path: 'posts',
  path_id: 'post_id'
})
class Post extends BaseModel {
  @Field({
    is_required: true,
  })
  public title!: string;

  @Field({
    is_required: false,
  })
  public content?: string;

  @Field({
    is_required: true,
    field_name: 'author_id'
  })
  public authorId!: string;

  // Belongs to one user
  @BelongsTo({
    model: User,
    localKey: 'authorId'
  })
  public author?: User;

  // Many-to-many: Post belongs to many tags through post_tags
  @BelongsToMany({
    model: Tag,
    through: PostTag,
    thisKey: 'post_id',
    otherKey: 'tag_id'
  })
  public tags?: Tag[];
}

// Role model (many-to-many with User)
@Model({
  reference_path: 'roles',
  path_id: 'role_id'
})
class Role extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public description?: string;

  // Many-to-many: Role belongs to many users through user_roles
  @BelongsToMany({
    model: User,
    through: UserRole,
    thisKey: 'role_id',
    otherKey: 'user_id'
  })
  public users?: User[];
}

// Junction table for User-Role many-to-many relationship
@Model({
  reference_path: 'user_roles',
  path_id: 'user_role_id'
})
class UserRole extends BaseModel {
  @Field({
    is_required: true,
    field_name: 'user_id'
  })
  public userId!: string;

  @Field({
    is_required: true,
    field_name: 'role_id'
  })
  public roleId!: string;
}

// Tag model (many-to-many with Post)
@Model({
  reference_path: 'tags',
  path_id: 'tag_id'
})
class Tag extends BaseModel {
  @Field({
    is_required: true,
  })
  public name!: string;

  @Field({
    is_required: false,
  })
  public color?: string;

  // Many-to-many: Tag belongs to many posts through post_tags
  @BelongsToMany({
    model: Post,
    through: PostTag,
    thisKey: 'tag_id',
    otherKey: 'post_id'
  })
  public posts?: Post[];
}

// Junction table for Post-Tag many-to-many relationship
@Model({
  reference_path: 'post_tags',
  path_id: 'post_tag_id'
})
class PostTag extends BaseModel {
  @Field({
    is_required: true,
    field_name: 'post_id'
  })
  public postId!: string;

  @Field({
    is_required: true,
    field_name: 'tag_id'
  })
  public tagId!: string;
}

// Initialize Firebase for tests
let firebaseApp: any;
let connection: any;
let storage: any;

beforeAll(() => {
  // Initialize Firebase with test config
  firebaseApp = firebase.initializeApp(config.api.firebase);
  connection = firebaseApp.firestore();
  storage = firebaseApp.storage();

  // Initialize the ORM
  FirestoreOrmRepository.initGlobalConnection(connection);
  FirestoreOrmRepository.initGlobalStorage(storage);
});

describe('Advanced Relationship Support', () => {
  // Clean up test data before tests
  beforeEach(async () => {
    // Clean up all test data
    const models = [User, UserProfile, Post, Role, UserRole, Tag, PostTag];
    
    for (const ModelClass of models) {
      const records = await ModelClass.getAll();
      for (const record of records) {
        await record.remove();
      }
    }
  });

  test('should handle one-to-one relationships (hasOne)', async () => {
    // Create a user
    const user = new User();
    user.name = 'John Doe';
    user.email = 'john@example.com';
    await user.save();

    // Create a profile for the user
    const profile = new UserProfile();
    profile.userId = user.getId();
    profile.bio = 'Software developer';
    profile.avatar = 'avatar.jpg';
    await profile.save();

    // Load the user with profile relationship
    const userWithProfile = new User();
    await userWithProfile.load(user.getId());
    const loadedProfile = await userWithProfile.loadHasOne('profile');

    // Verify the relationship
    expect(loadedProfile).toBeDefined();
    expect(loadedProfile.bio).toBe('Software developer');
    expect(loadedProfile.userId).toBe(user.getId());
  }, 15000);

  test('should handle one-to-one relationships (belongsTo)', async () => {
    // Create a user
    const user = new User();
    user.name = 'Jane Smith';
    user.email = 'jane@example.com';
    await user.save();

    // Create a profile for the user
    const profile = new UserProfile();
    profile.userId = user.getId();
    profile.bio = 'Product manager';
    await profile.save();

    // Load the profile with user relationship
    const profileWithUser = new UserProfile();
    await profileWithUser.load(profile.getId());
    const loadedUser = await profileWithUser.loadBelongsTo('user');

    // Verify the relationship
    expect(loadedUser).toBeDefined();
    expect(loadedUser.name).toBe('Jane Smith');
    expect(loadedUser.getId()).toBe(user.getId());
  }, 15000);

  test('should handle one-to-many relationships (hasMany)', async () => {
    // Create a user
    const user = new User();
    user.name = 'Alice Johnson';
    user.email = 'alice@example.com';
    await user.save();

    // Create posts for the user
    const post1 = new Post();
    post1.title = 'First Post';
    post1.content = 'This is my first post';
    post1.authorId = user.getId();
    await post1.save();

    const post2 = new Post();
    post2.title = 'Second Post';
    post2.content = 'This is my second post';
    post2.authorId = user.getId();
    await post2.save();

    // Load the user with posts
    const userWithPosts = new User();
    await userWithPosts.load(user.getId());
    const posts = await userWithPosts.loadHasMany('posts');

    // Verify the relationship
    expect(posts).toBeDefined();
    expect(posts.length).toBe(2);
    expect(posts.map(p => p.title).sort()).toEqual(['First Post', 'Second Post']);
    expect(posts.every(p => p.authorId === user.getId())).toBe(true);
  }, 15000);

  test('should handle many-to-many relationships (belongsToMany)', async () => {
    // Create a user
    const user = new User();
    user.name = 'Bob Wilson';
    user.email = 'bob@example.com';
    await user.save();

    // Create roles
    const adminRole = new Role();
    adminRole.name = 'Admin';
    adminRole.description = 'Administrator role';
    await adminRole.save();

    const editorRole = new Role();
    editorRole.name = 'Editor';
    editorRole.description = 'Content editor role';
    await editorRole.save();

    // Create junction table entries
    const userRole1 = new UserRole();
    userRole1.userId = user.getId();
    userRole1.roleId = adminRole.getId();
    await userRole1.save();

    const userRole2 = new UserRole();
    userRole2.userId = user.getId();
    userRole2.roleId = editorRole.getId();
    await userRole2.save();

    // Load the user with roles
    const userWithRoles = new User();
    await userWithRoles.load(user.getId());
    const roles = await userWithRoles.loadBelongsToMany('roles');

    // Verify the relationship
    expect(roles).toBeDefined();
    expect(roles.length).toBe(2);
    expect(roles.map(r => r.name).sort()).toEqual(['Admin', 'Editor']);
  }, 15000);

  test('should handle complex relationship loading with loadWithRelationships', async () => {
    // Create a user
    const user = new User();
    user.name = 'Carol Davis';
    user.email = 'carol@example.com';
    await user.save();

    // Create a profile
    const profile = new UserProfile();
    profile.userId = user.getId();
    profile.bio = 'Full-stack developer';
    await profile.save();

    // Create posts
    const post = new Post();
    post.title = 'Understanding Relationships';
    post.content = 'This post explains ORM relationships';
    post.authorId = user.getId();
    await post.save();

    // Create roles
    const role = new Role();
    role.name = 'Developer';
    await role.save();

    const userRole = new UserRole();
    userRole.userId = user.getId();
    userRole.roleId = role.getId();
    await userRole.save();

    // Load user with all relationships
    const userWithAllRelationships = new User();
    await userWithAllRelationships.load(user.getId());
    await userWithAllRelationships.loadWithRelationships(['profile', 'posts', 'roles']);

    // Verify all relationships are loaded
    expect((userWithAllRelationships as any).profile).toBeDefined();
    expect((userWithAllRelationships as any).profile.bio).toBe('Full-stack developer');
    
    expect((userWithAllRelationships as any).posts).toBeDefined();
    expect((userWithAllRelationships as any).posts.length).toBe(1);
    expect((userWithAllRelationships as any).posts[0].title).toBe('Understanding Relationships');
    
    expect((userWithAllRelationships as any).roles).toBeDefined();
    expect((userWithAllRelationships as any).roles.length).toBe(1);
    expect((userWithAllRelationships as any).roles[0].name).toBe('Developer');
  }, 15000);

  test('should handle post-tag many-to-many relationships', async () => {
    // Create a post
    const post = new Post();
    post.title = 'Test Post';
    post.content = 'Testing many-to-many relationships';
    post.authorId = 'test-author-id';
    await post.save();

    // Create tags
    const tag1 = new Tag();
    tag1.name = 'JavaScript';
    tag1.color = 'yellow';
    await tag1.save();

    const tag2 = new Tag();
    tag2.name = 'TypeScript';
    tag2.color = 'blue';
    await tag2.save();

    // Create junction table entries
    const postTag1 = new PostTag();
    postTag1.postId = post.getId();
    postTag1.tagId = tag1.getId();
    await postTag1.save();

    const postTag2 = new PostTag();
    postTag2.postId = post.getId();
    postTag2.tagId = tag2.getId();
    await postTag2.save();

    // Load post with tags
    const postWithTags = new Post();
    await postWithTags.load(post.getId());
    const tags = await postWithTags.loadBelongsToMany('tags');

    // Verify the relationship
    expect(tags).toBeDefined();
    expect(tags.length).toBe(2);
    expect(tags.map(t => t.name).sort()).toEqual(['JavaScript', 'TypeScript']);

    // Test the reverse relationship (tag to posts)
    const tagWithPosts = new Tag();
    await tagWithPosts.load(tag1.getId());
    const posts = await tagWithPosts.loadBelongsToMany('posts');

    expect(posts).toBeDefined();
    expect(posts.length).toBe(1);
    expect(posts[0].title).toBe('Test Post');
  }, 15000);

  test('should handle legacy getManyRel method (backward compatibility)', async () => {
    // Create a user
    const user = new User();
    user.name = 'Legacy Test User';
    await user.save();

    // Create posts using the legacy approach
    const post1 = new Post();
    post1.title = 'Legacy Post 1';
    post1.authorId = user.getId();
    await post1.save();

    const post2 = new Post();
    post2.title = 'Legacy Post 2';
    post2.authorId = user.getId();
    await post2.save();

    // Use the legacy getManyRel method
    // Note: This assumes Posts have a field that matches User's pathId
    const posts = await user.getManyRel(Post);

    // Verify the legacy method works
    expect(posts).toBeDefined();
    expect(posts.length).toBe(2);
  }, 15000);
});