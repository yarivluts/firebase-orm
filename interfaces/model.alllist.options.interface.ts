export interface ModelAllListOptions {

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
  }