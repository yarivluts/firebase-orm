import * as firebase from "firebase";
import 'firebase/storage';
import { FirestoreOrmRepository } from "../../index";
import { config } from "../config";
import { Member } from "../model/member";
import { Product } from "../model/product";

/* if (typeof window === 'undefined') {
  var admin = require("firebase-admin");
  var firebaseApp:any = admin.initializeApp(config.api['firebase-admin']); 
  var storage = firebaseApp.storage().bucket('fir-orm-4311d.appspot.com');

}else{
  var firebaseApp:any = firebase.initializeApp(config.api.firebase); 
  var storage = firebaseApp.storage();

} */

var firebaseApp:any = firebase.initializeApp(config.api.firebase); 
var storage = firebaseApp.storage();
    var connection = firebaseApp.firestore();

    FirestoreOrmRepository.initGlobalConnection(connection);
    FirestoreOrmRepository.initGlobalStorage(storage);
    FirestoreOrmRepository.initGlobalPath('website_id','50');
    FirestoreOrmRepository.initGlobalElasticsearchConnection(config.api.elasticsearch.url);

    test('remove all memebers', async () => {
      var members = await Member.getAll();
      for(var i = 0;members.length > i ;i++){
        var member = members[i];
       // console.log('members testt --- ',member);
        await member.remove();
      }
      var otherMembers = await Member.getAll();
      expect(otherMembers.length).toBe(0);
    }); 
 
 
    test('create new members', async () => { 
      var member = new Member(); 
      member.photoUrl = 'url1';
      member.name = 'name1 name2 name3';
     // console.log(member);
      await member.save();
 
      var member = new Member();
      member.photoUrl = 'url1';
      member.name = 'name1 nameddfd name3';
     // console.log(member);
      await member.save(); 
      
      var member = new Member();
      member.photoUrl = 'url2';
      member.name = 'name1 !name2 name3';
      //console.log(member.getData());
      await member.save();
  
      var members = await Member.getAll();

      expect(members.length).toBe(3);
    });

    
    test('fetch members with query', async () => { 
      var memebrs = await Member.query().where('photoUrl','==','url1').get();
      expect(memebrs.length).toBe(2);
    });
      
    test('fetch members with query and startAfter', async () => { 
      var memebrs = await Member.query().where('photoUrl','==','url1').get();
      var firstMember = memebrs[0];
      var query = await Member.query().where('photoUrl','==','url1').startAfter(firstMember);
      var filteredmMemebrs = await query.get();
      expect(filteredmMemebrs.length).toBe(1);
    });

    test('fetch members with query or where', async () => { 
      var memebrs = await Member.query()
      .where('photoUrl','==','url1')
      .orWhere('photoUrl','==','url2')
      .orWhere('name','==','name1 name2 name3').orderBy('created_at','desc').limit(1).get();
      memebrs.forEach((member) => {
      //  console.log('or where ',member);
      })
      expect(memebrs.length).toBe(1);
    }); 
      
    test('fetch members with query like', async () => { 
      var memebrs = await Member.query()
      .where('photoUrl','==','url2')
      .like('name','%!name%').get();
      memebrs.forEach((member) => {
        //console.log('like ',member.getData());
        member.photoUrl = 'urlvvv';
        member.save();
      }) 
      expect(memebrs.length).toBe(1);
    }); 
      

    
   /*  test('fetch members with query like and on', async () => { 
      var callback = await Member.query()
      .where('photoUrl','==','url2')
      .like('name','%!name%').on((memebrs:Member[]) => {
        memebrs.forEach((member:Member) => {
          //console.log('like ',member.getData());
          member.photoUrl = 'urlvvv';
          member.save();
        }) 
        setTimeout(function () {
          expect(memebrs.length).toBe(1);
      }, 10000);
       
      });
      callback();
    });  */
   
    
    test('Check elasticsearch sql', async () => { 
      //var result = await Product.elasticSql('select * from products',3);
      var result:any = await Product.elasticSql(
        ['SELECT * from products WHERE qty in (:qty)'
      ,{
        'qty' : [
          'a',
          2,
          'sssaaa'
        ]
      }],10);
      var index = 1;
      //console.log(' fetch '+index,result.data);
      console.log(' count ',index, await result.count());
      var current = 0;
      /*   while(result.next){
          index++;
          var result = await result.next();
            console.log(' fetch '+index,result.data);
          current++;
          if(current > 50){
            console.error('endless loop');
            break;
          }
        } */
      expect(1).toBe(1);
    });  
       
 
       test('Load object', async () => { 
        var products = await Product.getAll();
        products.forEach((product) => {
         // console.log('product ---> ',product.getStorageFile('productUrl').getRef());
        });
        expect(1).toBe(1);
      });  
 
       test('Check image upload from url', async () => { 
        //var result = await Product.elasticSql('select * from products',3);
        var product = new Product();
        product.name = 'test product';
        var uploadObject = product.getStorageFile('photoUrl');
        await uploadObject.uploadFromUrl(
          'https://img.wcdn.co.il/f_auto,w_300,t_54/2/7/7/6/2776371-46.jpeg'
          , function(snapshot:any){
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          //  console.log('222222 Upload is ' + progress + '% done');
            switch (snapshot.state) {
              case firebase.storage.TaskState.PAUSED: // or 'paused'
              //  console.log('222222 Upload is paused');
                break;
              case firebase.storage.TaskState.RUNNING: // or 'running'
           //     console.log('222222 Upload is running');
                break;
            }
          }, function(error:any) {
            // Handle unsuccessful uploads
          }, function(task:any) {
            // Handle successful uploads on complete
            // For instance, get the download URL: https://firebasestorage.googleapis.com/...
            task.snapshot.ref.getDownloadURL().then(function(downloadURL:any) {
              console.log('File available at', downloadURL);
            });
          });
      //    console.log('product ===== ',product.getData());
          await product.save();
        //console.log('task ===== ',task);
        
        expect(1).toBe(1);
      }); 
   