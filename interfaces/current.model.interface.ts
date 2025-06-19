import { ModelInterface } from "./model.interface.js";
import { FirestoreOrmRepository } from "../repository.js";

export interface CurrentModelInterface {
    currentModel : this & ModelInterface;
    repository: FirestoreOrmRepository;
}