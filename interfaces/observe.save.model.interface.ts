import { ModelInterface } from "./model.interface";
import { FirestoreOrmRepository } from "../repository";

export interface ObserveSaveModelInterface {
    observeSaveBefore() : void;
    observeSaveAfter() : void;  
}