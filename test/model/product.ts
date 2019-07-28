import { Field, BaseModel,Model} from "../../index";

@Model({
    reference_path : 'products',
    path_id : 'product_id'
})
export class Product extends BaseModel{
 
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