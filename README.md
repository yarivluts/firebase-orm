Arbel Firebase Orm is an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping)
that can run in NodeJS, Browser, Cordova, PhoneGap, Ionic, React Native, NativeScript, Expo, and Electron platforms
and can be used with TypeScript and JavaScript (ES5, ES6, ES7, ES8).

Firebase ORM supports only Active Record pattern for now.

Some Arbel Firebase Orm features:

- supports ActiveRecord
- allow to specify the Firestore database sturcture as Orm
- easy way to keep the Firestore nosql sturcture orginazied and easy to managed
- fetching list and data in real-time (Firesotre feature)
- store created time and updated time automaticly

And more...

With Firebase ORM your models look like this:

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "websites/:website_id/members",
  path_id: "member_id"
})
export class Member extends BaseModel {
  @Field({
    is_required: true
  })
  public name!: string;

  @Field({
    is_required: true,
    field_name: "photo_url"
  })
  public photoUrl!: string;
}
```

And your domain logic looks like this:

```typescript
const member = new Member();
member.name = "Timber";
member.photoUrl = "https://www.example.com/image.png";
member.save()

//To access the data in hierarchy
//Get the website google from the database
const google = await Website.findOne('domain','==','www.google.com');

//Get the linkes under google website
const links = await google.getModel(Link).getAll();

//Using sql to find links inside google model
const list = await google.sql("select * from links where name = 'some link'");


//Get all members
const allMembers = await Member.getAll();

//Get all members with age > 3 and weight > 30
const list = await Member.query().where('age','>','3').where('weight','>','30').get();

//Get all members with age > 3 or age < 3 limit 10
const list = await Member.query().where('age','>','3').orWhere('age','<','3').limit(10).get();

//Get the member tom
const tom = await Member.findOne('firstName','==','Tom');

//Listen to changes in tom data in real time
var unsubscribe = tom.on(()=>{
    //Do something
});

//Get all the list in real time
var unsubscribe = Member.onList((member) => {
    //Do someting with the meber
})
//Get all the list in real time when new meber is addedd
var unsubscribe = Member.onList((member) => {
    //Do someting with the meber
},LIST_EVENTS.ADDEDD)
//Or
var unsubscribe = Member.onModeList({

    /**
     * Listen to add new objects from now
     */
    added?: CallableFunction;

    /**
     * Listen to removed objects
     */
    removed? : CallableFunction

    /**
     * Listen to modify objects
     */
    modified? : CallableFunction

    /**
     * Listen to init loading objects
     */
    init? : CallableFunction
  })

//Kill the listen process
unsubscribe();

```

## Installation

1. Install the npm package:

   `npm install @arbel/firebase-orm firebase rxfire moment --save`

##### TypeScript configuration

Also, make sure you are using TypeScript compiler version **3.3** or greater,
and you have enabled the following settings in `tsconfig.json`:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
"strictPropertyInitialization" : false,
```

You may also need to enable `es6` in the `lib` section of compiler options, or install `es6-shim` from `@types`.

## Quick Start

1.Create global connection

```typescript
import * as app from "firebase";
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

var firebaseApp = FirestoreOrmRepository.initializeApp(config);

```

2.Create global path id - (optinal)

```typescript
import { FirestoreOrmRepository } from "@arbel/firebase-orm";

FirestoreOrmRepository.initGlobalPath("user_id", 50);
```

3.Create new object

```typescript
import { Member } from "model/member";

const member = new Member();
member.name = "Timber";
member.photoUrl = "https://www.example.com/image.png";
member.save();
```

## Database Structure

- only varibales with the decorator @Field will save in the database
- every model must to include path_id attribute that need to be unique
- reference_path is the path of the model data inside the dataabse

## Text indexing / LIKE Search

1.Add the flag `is_text_indexing` to @Field decorator

```typescript
import { Field, BaseModel, Model } from "@arbel/firebase-orm";

@Model({
  reference_path: "websites/:website_id/members",
  path_id: "member_id"
})
export class Member extends BaseModel {
  @Field({
    is_text_indexing: true
  })
  public name!: string;

  @Field({
    is_required: true
  })
  public age!: number;

  @Field({
    is_required: true
  })
  public weight!: number;
}
```

2. save new value inside the variable.
3. use like operator as you need

```typescript
//Get all members with age > 3 and weight > 30 and name conatin `Dav`
const list = await Member.query()
  .where("age", ">", "3")
  .where("weight", ">", "30")
  .like("name", "%Dav%")
  .get();
```

## Elasticsearch support

1.Add firebase function with onWrite trigger

```typescript
import * as functions from "firebase-functions";
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  cloud: {
    id: "xxxxxxx",
    username: "xxxxx",
    password: "xxxxxxx"
  }
});

export const elasticsearchProductsSync = functions.firestore
  .document("products/{productId}")
  .onWrite((snap, context) => {
    const productId = context.params.productId;
    const newData = snap.after.data();
    // ...or the previous value before this update
    const previousData = snap.before.data();

    if (newData) {
      newData.id = productId;

      if (!previousData) {
        printLog("create new product - ", productId);
        client
          .create({
            index: "products",
            type: "_doc",
            id: productId,
            body: newData
          })
          .catch(e => {
            var error =
              e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
            console.error("Elasticsearch error - ", error);
          });
      } else {
        printLog("update product - ", productId);
        client.transport
          .request({
            method: "POST",
            path: "/products/_doc/" + productId,
            body: newData
          })
          .catch(e => {
            var error =
              e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
            console.error("Elasticsearch error - ", error);
          });
      }
    } else {
      printLog("delete product - ", productId);
      client
        .delete({
          index: "products",
          type: "_doc",
          id: productId
        })
        .catch(e => {
          var error =
            e.meta && e.meta.body && e.meta.body.error ? e.meta.body : e;
          console.error("Elasticsearch error - ", error);
        });
    }

    return true;
  });
```

2. set global elasticsearch url

```typescript
FirestoreOrmRepository.initGlobalElasticsearchConnection(
  "https://elasticsearch.com"
);
```

3. fetch the data as sql

```typescript
var result: any = await Product.elasticSql("WHERE qty > 0", 3);
//Total rows
var totalCount = await result.count();
var current = 0;
//Pagination
while (result.next) {
  index++;
  var result = await result.next();
}
```

4. or to use binding sql

```typescript
var result: any = await Product.elasticSql([
  "WHERE name in (:options)  and cost > :cost",
  {
    options: ["a", "b", "c"],
    cost: 9
  }
]);
//Total rows
var totalCount = await result.count();
var current = 0;
//Pagination
while (result.next) {
  index++;
  var result = await result.next();
}
```

## Firebase Storage support

1.Initilize firebase storage connection

```typescript
var firebaseApp: any = firebase.initializeApp(config.api.firebase);
var storage = firebaseApp.storage();
FirestoreOrmRepository.initGlobalStorage(storage);
```

2. Get the storage reference of the wanted field

```typescript
var product = new Product();
product.name = "test product";
var storageRef = product.getStorageFile("photoUrl");
```

3. Upload file

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadFile(file);
product.save();
```

4. Upload file from string

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadString(file,'base64');
product.save();
```

5. Upload file from url (copy file to storage)

```typescript
var product = new Product();
await product.getStorageFile("photoUrl").uploadFromUrl(url);
product.save();
```

6. Get file firebase storage ref 

```typescript
var product = new Product();
var ref = product.getStorageFile("photoUrl").getRef();
```

7. Track progress
```typescript
var product = new Product();
product.name = "test product";
var storageRef = product.getStorageFile("photoUrl");
await storageRef.uploadFromUrl(
  "https://img.example.com/image.jpg",
  function(snapshot: any) {
    // Observe state change events such as progress, pause, and resume
    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    switch (snapshot.state) {
      case firebase.storage.TaskState.PAUSED: // or 'paused'
        break;
      case firebase.storage.TaskState.RUNNING: // or 'running'
        break;
    }
  },
  function(error: any) {
    // Handle unsuccessful uploads
  },
  function(task: any) {
    // Handle successful uploads on complete
    // For instance, get the download URL: https://firebasestorage.googleapis.com/...
    task.snapshot.ref.getDownloadURL().then(function(downloadURL: any) {
      printLog("File available at", downloadURL);
    });
  }
);
await product.save();
```
