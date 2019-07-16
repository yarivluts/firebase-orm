import { Field, BaseModel,Model} from "../../index";

@Model({
    reference_path : 'websites/:website_id/members',
    path_id : 'member_id'
})
export class Member extends BaseModel{
 
    @Field({
        is_required : true,
        is_text_indexing : true
    })
    public name!: string;

    @Field({
        is_required : true,
        field_name : 'photo_url'
    })
    public photoUrl! : string;

 
}