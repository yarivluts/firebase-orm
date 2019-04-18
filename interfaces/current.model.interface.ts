import { ModelInterface } from "./model.interface";
import { FirestoreOrmRepository } from "../repository";

export interface CurrentModelInterface {
    currentModel : this & ModelInterface;
    repository: FirestoreOrmRepository;
}