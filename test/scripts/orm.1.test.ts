import * as app from "firebase";
import { FirestoreOrmRepository } from "../../index";
import { config } from "../config";
import { Member } from "../model/member";

    var firebaseApp = app.initializeApp(config.api.firebase); 
    var connection = firebaseApp.firestore();

    FirestoreOrmRepository.initGlobalConnection(connection);
    FirestoreOrmRepository.initGlobalPath('website_id','50');
 
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
      

    
    test('fetch members with query like and on', async () => { 
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
    }); 
      

   