import { ModelInterface } from "./model.interface";
import { FirestoreOrmRepository } from "../repository";

export interface ObserveRemoveModelInterface { 
    observeRemoveBefore() : void;
    observeRemoveAfter() : void;

}