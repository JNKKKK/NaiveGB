class Bridge {
    constructor () {

    }

    register (name, entity) {
        this[name] = entity
    }
}

export default Bridge
