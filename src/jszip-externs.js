// declarations of JSZip for closure compiler

/**
    @externs
*/

const JSZip = class {
    constructor() {
        this.files;
        this.root;
    }

    /**
        @param {string} filename
        @param {*=} content
    */
    file(filename, content) {}

    forEach(cb) {}

    getCompleteFileList() {}

    getEntries() {}

    loadAsync(content) {}
};
