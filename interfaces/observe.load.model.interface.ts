import { ModelInterface } from "./model.interface";
import { FirestoreOrmRepository } from "../repository";

export interface ObserveLoadModelInterface {
    observeLoadBefore() : void;
    observeLoadAfter() : void; 
}